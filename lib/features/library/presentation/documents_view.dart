import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:scan2/core/haptics/app_haptics.dart';
import 'package:scan2/core/theme/tactile.dart';
import 'package:scan2/core/widgets/pressable_scale.dart';
import 'package:scan2/features/crop/domain/image_processor.dart';
import 'package:scan2/features/home/domain/import_service.dart';
import 'package:scan2/features/home/presentation/tools_row.dart';
import 'package:scan2/features/library/data/document_store.dart';
import 'package:scan2/features/ocr/domain/on_device_ocr.dart';
import 'package:scan2/features/ocr/presentation/ocr_result_screen.dart';
import 'package:scan2/features/shared/providers/settings_provider.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:scan2/core/theme/brand.dart';
import 'package:scan2/core/widgets/illustrations.dart';
import 'package:scan2/core/widgets/page_thumbnail.dart';
import 'package:scan2/core/widgets/paper.dart';
import 'package:scan2/features/library/domain/document.dart';
import 'package:scan2/features/shared/providers/db_provider.dart';

enum DocumentSort {
  newest('Newest first', Icons.schedule_rounded),
  oldest('Oldest first', Icons.history_rounded),
  name('Name', Icons.sort_by_alpha_rounded),
  pages('Most pages', Icons.layers_rounded);

  const DocumentSort(this.label, this.icon);

  final String label;
  final IconData icon;
}

/// The documents workspace: search, sort, grid or list, and multi-select.
class DocumentsView extends ConsumerStatefulWidget {
  const DocumentsView({super.key});

  @override
  ConsumerState<DocumentsView> createState() => _DocumentsViewState();
}

class _DocumentsViewState extends ConsumerState<DocumentsView> {
  final _searchController = TextEditingController();
  String _query = '';
  DocumentSort _sort = DocumentSort.newest;
  bool _gridView = true;
  final Set<int> _selected = {};

  static final _importer = ImportService();
  static final _ocr = OnDeviceOcr();

  bool get _selecting => _selected.isNotEmpty;
  bool _working = false;
  String _workingLabel = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final async = ref.watch(documentsProvider);
    final all = async.valueOrNull;
    final documents = _sorted(_filtered(all ?? const []));
    final loading = all == null && async.isLoading;
    final hasAny = (all ?? const []).isNotEmpty;

    final body = Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        bottom: false,
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 220),
                child: _selecting
                    ? _SelectionBar(
                        key: const ValueKey('selecting'),
                        count: _selected.length,
                        onCancel: () => setState(_selected.clear),
                        onSelectAll: () => setState(() {
                          _selected
                            ..clear()
                            ..addAll(documents.map((d) => d.id));
                        }),
                        onDelete: () => _deleteSelected(documents),
                      )
                    : _Header(
                        key: const ValueKey('header'),
                        count: all?.length ?? 0,
                      ),
              ),
            ),
            if (!_selecting)
              SliverToBoxAdapter(
                child: ToolsRow(
                  onImportFiles: _importFiles,
                  onImportPhotos: _importPhotos,
                  onExtractText: _extractText,
                ),
              ),
            if (hasAny) ...[
              SliverToBoxAdapter(child: _searchField(theme)),
              SliverToBoxAdapter(child: _toolBar(theme, documents.length)),
            ],
            if (loading)
              const SliverFillRemaining(
                hasScrollBody: false,
                child: Center(child: CircularProgressIndicator()),
              )
            else if (documents.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: _query.isEmpty
                    ? const _EmptyLibrary()
                    : _NoResults(query: _query),
              )
            else if (_gridView)
              _grid(documents)
            else
              _list(documents),
          ],
        ),
      ),
    );

    if (!_working) return body;
    return Stack(
      children: [
        body,
        Positioned.fill(
          child: ColoredBox(
            color: Brand.ink.withValues(alpha: 0.55),
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const CircularProgressIndicator(color: Colors.white),
                  const SizedBox(height: 18),
                  Text(
                    _workingLabel,
                    style: theme.textTheme.titleSmall?.copyWith(
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  // ---- Tools -------------------------------------------------------------

  Future<void> _importPhotos() => _runImport(
    'Reading photos…',
    (filter, onProgress) =>
        _importer.fromPhotos(filter: filter, onProgress: onProgress),
  );

  Future<void> _importFiles() => _runImport(
    'Reading files…',
    (filter, onProgress) =>
        _importer.fromFiles(filter: filter, onProgress: onProgress),
  );

  /// Shared by both import routes: pick, process, file as one document, open
  /// it. Cancelling the picker is a no-op rather than an error — backing out
  /// of a file browser is not a failure.
  Future<void> _runImport(
    String label,
    Future<List<ProcessedPage>> Function(
      ScanFilter filter,
      void Function(int done, int total) onProgress,
    ) pick,
  ) async {
    if (_working) return;
    final repository = ref.read(documentRepositoryProvider);
    if (repository is! DocumentStore) {
      _message('Importing is available on iOS and Android.');
      return;
    }
    final filter = ref.read(settingsProvider).defaultFilter;
    setState(() {
      _working = true;
      _workingLabel = label;
    });
    try {
      final pages = await pick(filter, (done, total) {
        if (!mounted || total < 2) return;
        setState(() => _workingLabel = 'Reading page $done of $total…');
      });
      if (pages.isEmpty) return;
      final doc = await repository.createProcessedDocument(pages: pages);
      bumpLibrary(ref);
      await AppHaptics.success();
      if (mounted) context.push('/library/document/${doc.id}');
    } catch (e) {
      await AppHaptics.error();
      if (mounted) _message(_readable(e));
    } finally {
      if (mounted) setState(() => _working = false);
    }
  }

  Future<void> _extractText() async {
    if (_working) return;
    try {
      final bytes = await _importer.pickImageBytes();
      if (bytes == null) return;
      if (!mounted) return;
      setState(() {
        _working = true;
        _workingLabel = 'Reading the text…';
      });
      final text = await _ocr.recognize(bytes);
      if (!mounted) return;
      setState(() => _working = false);
      await AppHaptics.success();
      if (!mounted) return;
      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => OcrResultScreen(text: text),
        ),
      );
    } catch (e) {
      await AppHaptics.error();
      if (mounted) {
        setState(() => _working = false);
        _message(_readable(e));
      }
    }
  }

  String _readable(Object error) {
    final text = error is StateError ? error.message : error.toString();
    return text.length > 160 ? '${text.substring(0, 160)}…' : text;
  }

  void _message(String text) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(text)));
  }

  // -------------------------------------------------------------------------

  List<Document> _filtered(List<Document> documents) {
    if (_query.isEmpty) return documents;
    final needle = _query.toLowerCase();
    return [
      for (final doc in documents)
        if (doc.title.toLowerCase().contains(needle)) doc,
    ];
  }

  List<Document> _sorted(List<Document> documents) {
    final list = [...documents];
    switch (_sort) {
      case DocumentSort.newest:
        list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      case DocumentSort.oldest:
        list.sort((a, b) => a.createdAt.compareTo(b.createdAt));
      case DocumentSort.name:
        list.sort(
          (a, b) => a.title.toLowerCase().compareTo(b.title.toLowerCase()),
        );
      case DocumentSort.pages:
        list.sort((a, b) => b.pageCount.compareTo(a.pageCount));
    }
    return list;
  }

  Widget _searchField(ThemeData theme) {
    final scheme = theme.colorScheme;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 2, 20, 16),
      child: TextField(
        controller: _searchController,
        onChanged: (value) => setState(() => _query = value),
        textInputAction: TextInputAction.search,
        style: theme.textTheme.bodyMedium?.copyWith(
          fontWeight: FontWeight.w600,
        ),
        decoration: InputDecoration(
          hintText: 'Search your documents',
          hintStyle: theme.textTheme.bodyMedium?.copyWith(
            color: scheme.onSurfaceVariant,
            fontWeight: FontWeight.w500,
          ),
          prefixIcon: Icon(
            Icons.search_rounded,
            size: 21,
            color: scheme.onSurfaceVariant,
          ),
          suffixIcon: _query.isEmpty
              ? null
              : TactileIconButton(
                  icon: Icons.cancel_rounded,
                  size: 19,
                  tooltip: 'Clear search',
                  color: scheme.onSurfaceVariant,
                  onPressed: () {
                    _searchController.clear();
                    setState(() => _query = '');
                  },
                ),
          isDense: true,
          filled: true,
          fillColor: theme.brightness == Brightness.light
              ? Colors.white
              : scheme.surface,
          contentPadding: const EdgeInsets.symmetric(vertical: 15),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(Brand.radiusField),
            borderSide: BorderSide(color: scheme.outlineVariant),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(Brand.radiusField),
            borderSide: BorderSide(color: scheme.outlineVariant),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(Brand.radiusField),
            borderSide: BorderSide(color: scheme.primary, width: 1.6),
          ),
        ),
      ),
    );
  }

  Widget _toolBar(ThemeData theme, int shown) {
    final scheme = theme.colorScheme;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 16, 12),
      child: Row(
        children: [
          Text(
            '$shown document${shown == 1 ? '' : 's'}',
            style: theme.textTheme.labelMedium,
          ),
          const Spacer(),
          PopupMenuButton<DocumentSort>(
            initialValue: _sort,
            tooltip: 'Sort',
            position: PopupMenuPosition.under,
            onSelected: (value) {
              AppHaptics.selection();
              setState(() => _sort = value);
            },
            itemBuilder: (context) => [
              for (final option in DocumentSort.values)
                PopupMenuItem(
                  value: option,
                  child: Row(
                    children: [
                      Icon(
                        option.icon,
                        size: 18,
                        color: option == _sort
                            ? scheme.primary
                            : scheme.onSurfaceVariant,
                      ),
                      const SizedBox(width: 12),
                      Text(option.label),
                    ],
                  ),
                ),
            ],
            child: Container(
              padding: const EdgeInsets.fromLTRB(12, 8, 10, 8),
              decoration: BoxDecoration(
                color: theme.brightness == Brightness.light
                    ? Colors.white
                    : scheme.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: scheme.outlineVariant),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.swap_vert_rounded, size: 17, color: scheme.primary),
                  const SizedBox(width: 6),
                  Text(_sort.label, style: theme.textTheme.labelMedium),
                ],
              ),
            ),
          ),
          const SizedBox(width: 8),
          _ViewToggle(
            gridView: _gridView,
            onChanged: (value) => setState(() => _gridView = value),
          ),
        ],
      ),
    );
  }

  Widget _grid(List<Document> documents) {
    return SliverPadding(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 150),
      sliver: SliverGrid(
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          mainAxisSpacing: 22,
          crossAxisSpacing: 18,
          childAspectRatio: 0.60,
        ),
        delegate: SliverChildBuilderDelegate(
          childCount: documents.length,
          (context, index) => Reveal(
            index: index,
            key: ValueKey('tile-${documents[index].id}'),
            child: _DocumentTile(
              document: documents[index],
              index: index,
              selected: _selected.contains(documents[index].id),
              selecting: _selecting,
              onTap: () => _open(documents[index]),
              onToggle: () => _toggle(documents[index]),
            ),
          ),
        ),
      ),
    );
  }

  Widget _list(List<Document> documents) {
    return SliverPadding(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 150),
      sliver: SliverList.separated(
        itemCount: documents.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, index) => Reveal(
          index: index,
          key: ValueKey('row-${documents[index].id}'),
          child: _DocumentRow(
            document: documents[index],
            index: index,
            selected: _selected.contains(documents[index].id),
            selecting: _selecting,
            onTap: () => _open(documents[index]),
            onToggle: () => _toggle(documents[index]),
          ),
        ),
      ),
    );
  }

  void _open(Document document) {
    if (_selecting) {
      _toggle(document);
      return;
    }
    context.push('/library/document/${document.id}');
  }

  void _toggle(Document document) {
    setState(() {
      if (!_selected.remove(document.id)) _selected.add(document.id);
    });
  }

  Future<void> _deleteSelected(List<Document> documents) async {
    final count = _selected.length;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Delete $count document${count == 1 ? '' : 's'}?'),
        content: const Text('This cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.error,
            ),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    final repository = ref.read(documentRepositoryProvider);
    for (final id in _selected.toList()) {
      await repository.deleteDocument(id);
    }
    AppHaptics.success();
    setState(_selected.clear);
    bumpLibrary(ref);
  }
}

// ---------------------------------------------------------------------------

/// The brand, then the screen's job.
///
/// The old header carried a settings button that duplicated the one already in
/// the bottom bar. Its place is better spent putting the mark on the screen
/// people open every day — an app whose identity only appears during
/// onboarding does not have one.
class _Header extends StatelessWidget {
  const _Header({super.key, required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const ScanellaAppMark(size: 34),
              const SizedBox(width: 10),
              const ScanellaWordmark(fontSize: 20),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
                decoration: BoxDecoration(
                  color: theme.colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.lock_rounded,
                      size: 12,
                      color: theme.colorScheme.onPrimaryContainer,
                    ),
                    const SizedBox(width: 5),
                    Text(
                      'On device',
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: theme.colorScheme.onPrimaryContainer,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Text('Documents', style: theme.textTheme.headlineMedium),
          const SizedBox(height: 4),
          Text(
            count == 0
                ? 'Everything you scan lives here'
                : '$count saved on this device',
            style: theme.textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}

class _SelectionBar extends StatelessWidget {
  const _SelectionBar({
    super.key,
    required this.count,
    required this.onCancel,
    required this.onSelectAll,
    required this.onDelete,
  });

  final int count;
  final VoidCallback onCancel;
  final VoidCallback onSelectAll;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 14, 20, 18),
      padding: const EdgeInsets.fromLTRB(6, 6, 8, 6),
      decoration: BoxDecoration(
        color: theme.colorScheme.primary,
        borderRadius: BorderRadius.circular(Brand.radiusCard),
      ),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.close_rounded),
            onPressed: onCancel,
            tooltip: 'Cancel',
            color: theme.colorScheme.onPrimary,
          ),
          Text(
            '$count selected',
            style: theme.textTheme.titleSmall?.copyWith(
              color: theme.colorScheme.onPrimary,
            ),
          ),
          const Spacer(),
          TextButton(
            onPressed: onSelectAll,
            style: TextButton.styleFrom(
              foregroundColor: theme.colorScheme.onPrimary,
            ),
            child: const Text('Select all'),
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline_rounded),
            tooltip: 'Delete',
            onPressed: onDelete,
            color: theme.colorScheme.onPrimary,
          ),
        ],
      ),
    );
  }
}

/// Grid and list, as a two-state pill rather than an icon that changes
/// meaning. An icon button that toggles between two icons never tells you
/// which state you are looking at.
class _ViewToggle extends StatelessWidget {
  const _ViewToggle({required this.gridView, required this.onChanged});

  final bool gridView;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    Widget half(IconData icon, bool active, String tooltip, bool value) {
      return PressableScale(
        onPressed: active ? null : () => onChanged(value),
        enabled: !active,
        haptic: AppHaptic.selection,
        scale: Tactile.pressScaleIcon,
        overlay: false,
        minSize: 0,
        tooltip: tooltip,
        child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            curve: Curves.easeOut,
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
            decoration: BoxDecoration(
              color: active ? scheme.primary : Colors.transparent,
              borderRadius: BorderRadius.circular(9),
            ),
            child: Icon(
              icon,
              size: 17,
              color: active ? scheme.onPrimary : scheme.onSurfaceVariant,
            ),
          ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: theme.brightness == Brightness.light
            ? Colors.white
            : scheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          half(Icons.grid_view_rounded, gridView, 'Show as grid', true),
          half(Icons.view_agenda_rounded, !gridView, 'Show as list', false),
        ],
      ),
    );
  }
}

class _DocumentTile extends StatelessWidget {
  const _DocumentTile({
    required this.document,
    required this.index,
    required this.selected,
    required this.selecting,
    required this.onTap,
    required this.onToggle,
  });

  final Document document;
  final int index;
  final bool selected;
  final bool selecting;
  final VoidCallback onTap;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return PressableScale(
      onPressed: onTap,
      onLongPress: onToggle,
      haptic: AppHaptic.impactLight,
      scale: Tactile.pressScaleCard,
      overlay: false,
      minSize: 0,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: PaperSheet(
              selected: selected,
              stacked: document.pageCount > 1,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Hero(
                    tag: 'document-${document.id}',
                    child: PageThumbnail(
                      path: document.pages.isEmpty
                          ? null
                          : document.pages.first.path,
                      cacheWidth: 420,
                      seed: document.id + index,
                    ),
                  ),
                  if (document.pageCount > 1)
                    Positioned(
                      right: 8,
                      bottom: 8,
                      child: _PageBadge(count: document.pageCount),
                    ),
                  if (selecting)
                    Positioned(
                      left: 8,
                      top: 8,
                      child: _SelectionDot(selected: selected),
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            document.title,
            style: theme.textTheme.titleSmall,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 3),
          Text(
            DateFormat.MMMd().format(document.createdAt),
            style: theme.textTheme.labelSmall,
          ),
        ],
      ),
    );
  }
}

class _DocumentRow extends StatelessWidget {
  const _DocumentRow({
    required this.document,
    required this.index,
    required this.selected,
    required this.selecting,
    required this.onTap,
    required this.onToggle,
  });

  final Document document;
  final int index;
  final bool selected;
  final bool selecting;
  final VoidCallback onTap;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return PressableScale(
      onPressed: onTap,
      onLongPress: onToggle,
      haptic: AppHaptic.impactLight,
      scale: Tactile.pressScaleCard,
      borderRadius: BorderRadius.circular(Brand.radiusCard),
      minSize: 0,
      child: Container(
        decoration: BoxDecoration(
          color: theme.brightness == Brightness.light
              ? Colors.white
              : scheme.surface,
          borderRadius: BorderRadius.circular(Brand.radiusCard),
          border: Border.all(
            color: selected ? scheme.primary : scheme.outlineVariant,
            width: selected ? 2 : 1,
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              SizedBox(
                width: 56,
                height: 74,
                child: PaperSheet(
                  radius: 9,
                  lift: 0.6,
                  child: Hero(
                    tag: 'document-${document.id}',
                    child: PageThumbnail(
                      path: document.pages.isEmpty
                          ? null
                          : document.pages.first.path,
                      cacheWidth: 168,
                      seed: document.id + index,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      document.title,
                      style: theme.textTheme.titleSmall,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Icon(
                          Icons.layers_rounded,
                          size: 13,
                          color: scheme.onSurfaceVariant,
                        ),
                        const SizedBox(width: 5),
                        Text(
                          '${document.pageCount} page'
                          '${document.pageCount == 1 ? '' : 's'}',
                          style: theme.textTheme.labelSmall,
                        ),
                        const SizedBox(width: 10),
                        Text(
                          DateFormat.yMMMd().format(document.createdAt),
                          style: theme.textTheme.labelSmall,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              if (selecting)
                _SelectionDot(selected: selected)
              else
                Icon(
                  Icons.chevron_right_rounded,
                  color: scheme.onSurfaceVariant,
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PageBadge extends StatelessWidget {
  const _PageBadge({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: Brand.ink.withValues(alpha: 0.80),
        borderRadius: BorderRadius.circular(9),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.layers_rounded, size: 11, color: Colors.white),
          const SizedBox(width: 4),
          Text(
            '$count',
            style: theme.textTheme.labelSmall?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _SelectionDot extends StatelessWidget {
  const _SelectionDot({required this.selected});

  final bool selected;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return AnimatedContainer(
      duration: const Duration(milliseconds: 160),
      width: 26,
      height: 26,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: selected ? scheme.primary : Colors.white.withValues(alpha: 0.9),
        border: Border.all(
          color: selected ? scheme.primary : scheme.outline,
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: Brand.ink.withValues(alpha: 0.18),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: selected
          ? Icon(Icons.check_rounded, size: 17, color: scheme.onPrimary)
          : null,
    );
  }
}

/// The empty library.
///
/// This used to be three grey rectangles, on the one screen every new customer
/// sees first. The illustration set drawn for onboarding was only ever shown
/// during onboarding — so it earns its keep here instead.
class _EmptyLibrary extends StatelessWidget {
  const _EmptyLibrary();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: SingleChildScrollView(
        // The docked scan button floats over this area, and the hint was
        // running underneath it. Clearing its full height plus the bar.
        padding: const EdgeInsets.fromLTRB(32, 0, 32, 190),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              height: 210,
              child: HeroStage(
                // The disc is a fixed pale blue in the onboarding art, which
                // would burn a hole in a dark library. Everything else in the
                // composition — navy phone, white chips — carries over.
                discColor: theme.brightness == Brightness.light
                    ? const Color(0xFFEDF2FB)
                    : theme.colorScheme.surfaceContainerHigh,
                centre: const ScanningPhone(),
                chips: const [
                  HeroChip(
                    x: 0.10,
                    y: 0.30,
                    icon: Icons.picture_as_pdf_rounded,
                    color: Brand.pdfRed,
                    label: 'PDF',
                  ),
                  HeroChip(
                    x: 0.90,
                    y: 0.36,
                    icon: Icons.auto_fix_high_rounded,
                    color: Brand.accent,
                  ),
                  HeroChip(
                    x: 0.11,
                    y: 0.72,
                    icon: Icons.image_rounded,
                    color: Brand.imageGreen,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Your first scan starts here',
              style: theme.textTheme.titleLarge,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 10),
            Text(
              'Point the camera at a page. The edges are found, the '
              'page is straightened and cleaned up, and it lands here — '
              'without ever leaving your phone.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 22),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.arrow_downward_rounded,
                  size: 17,
                  color: theme.colorScheme.primary,
                ),
                const SizedBox(width: 8),
                Text(
                  'Tap the scan button',
                  style: theme.textTheme.labelLarge?.copyWith(
                    color: theme.colorScheme.primary,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _NoResults extends StatelessWidget {
  const _NoResults({required this.query});

  final String query;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(40, 0, 40, 130),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 62,
              height: 62,
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerHigh,
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.search_off_rounded,
                size: 28,
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 18),
            Text('No matches', style: theme.textTheme.titleMedium),
            const SizedBox(height: 6),
            Text(
              'Nothing here is called “$query”.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}
