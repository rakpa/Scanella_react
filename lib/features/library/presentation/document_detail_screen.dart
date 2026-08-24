import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:scan2/core/haptics/app_haptics.dart';
import 'package:scan2/core/theme/tactile.dart';
import 'package:scan2/core/widgets/pressable_scale.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:scan2/core/theme/brand.dart';
import 'package:scan2/core/widgets/page_thumbnail.dart';
import 'package:scan2/core/widgets/paper.dart';
import 'package:scan2/features/crop/domain/crop_args.dart';
import 'package:scan2/features/library/data/document_store.dart';
import 'package:scan2/features/library/domain/document.dart';
import 'package:scan2/features/library/domain/export_service.dart';
import 'package:scan2/features/library/presentation/widgets/export_sheet.dart';
import 'package:scan2/features/shared/providers/db_provider.dart';

class DocumentDetailScreen extends ConsumerStatefulWidget {
  const DocumentDetailScreen({super.key, required this.documentId});

  final int documentId;

  @override
  ConsumerState<DocumentDetailScreen> createState() =>
      _DocumentDetailScreenState();
}

class _DocumentDetailScreenState extends ConsumerState<DocumentDetailScreen> {
  static const _exporter = ExportService();
  bool _busy = false;
  String _busyLabel = '';

  @override
  Widget build(BuildContext context) {
    // Cached in a provider so an unrelated rebuild (a dialog opening, the
    // busy flag flipping) does not re-read the document and blank the list.
    final document = ref.watch(documentProvider(widget.documentId)).valueOrNull;
    final pages = document?.pages ?? const <ScanPage>[];
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: document == null
            ? const Text('Document')
            : _TitleBlock(document: document),
        actions: [
          TactileIconButton(
            icon: Icons.drive_file_rename_outline_rounded,
            tooltip: 'Rename',
            color: theme.colorScheme.onSurface,
            onPressed: document == null ? null : () => _rename(document),
          ),
          const SizedBox(width: 6),
        ],
      ),
      body: Stack(
        children: [
          if (document == null)
            const Center(child: CircularProgressIndicator())
          else if (pages.isEmpty)
            Center(
              child: Text(
                'This document has no pages.',
                style: theme.textTheme.bodyMedium,
              ),
            )
          else
            ReorderableListView.builder(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
              itemCount: pages.length,
              // Each card supplies its own handle. Left on, this draws a
              // second one over the top of ours on any platform Flutter
              // considers pointer-driven — desktop, web, an iPad with a
              // trackpad — so the row ends up with two overlapping grips.
              buildDefaultDragHandles: false,
              onReorderItem: (oldIndex, newIndex) =>
                  _reorder(document, oldIndex, newIndex),
              itemBuilder: (context, index) => _PageCard(
                key: ValueKey(pages[index].path),
                documentId: document.id,
                page: pages[index],
                index: index,
                onEdit: () => _edit(document, pages[index]),
                onDelete: () => _deletePage(document, pages[index]),
              ),
            ),
          if (_busy)
            Positioned.fill(
              child: ColoredBox(
                color: Brand.ink.withValues(alpha: 0.55),
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const CircularProgressIndicator(color: Colors.white),
                      if (_busyLabel.isNotEmpty) ...[
                        const SizedBox(height: 18),
                        Text(
                          _busyLabel,
                          style: theme.textTheme.titleSmall?.copyWith(
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
      bottomNavigationBar: document == null || pages.isEmpty
          ? null
          : _ActionBar(
              busy: _busy,
              onAddPage: () => context.push('/camera'),
              onExport: () => _export(document),
            ),
    );
  }

  void _edit(Document document, ScanPage page) {
    context.push(
      '/crop',
      extra: CropArgs(
        // Editing re-derives from the original capture when one was kept.
        imagePath: page.editSource,
        initialQuad: page.quad,
        adjustments: page.adjustments,
        edgesAlreadyApplied: document.edgesAlreadyApplied,
      ),
    );
  }

  Future<void> _export(Document document) async {
    if (kIsWeb) {
      _showMessage('Export is available on device.');
      return;
    }

    final action = await ExportSheet.show(context, document);
    if (action == null || !mounted) return;

    setState(() {
      _busy = true;
      _busyLabel = action == ExportAction.saveToPhotos
          ? 'Saving to Photos…'
          : 'Preparing PDF…';
    });

    try {
      final message = await runExportAction(action, document, _exporter);
      if (!mounted) return;
      AppHaptics.success();
      if (message.isNotEmpty) _showMessage(message);
    } catch (e) {
      debugPrint('Export failed: $e');
      // Surfaced rather than swallowed: an export that silently does nothing
      // is indistinguishable from a broken button.
      if (mounted) _showMessage('Export failed: ${_readable(e)}');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _readable(Object error) {
    final text = error.toString();
    return text.length > 140 ? '${text.substring(0, 140)}…' : text;
  }

  Future<void> _rename(Document document) async {
    final controller = TextEditingController(text: document.title);
    final name = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Rename scan'),
        content: TextField(
          controller: controller,
          autofocus: true,
          textCapitalization: TextCapitalization.sentences,
          decoration: const InputDecoration(labelText: 'Name'),
          onSubmitted: (value) => Navigator.pop(context, value),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text),
            child: const Text('Save'),
          ),
        ],
      ),
    );
    controller.dispose();

    final trimmed = name?.trim();
    if (trimmed == null || trimmed.isEmpty || !mounted) return;
    await ref
        .read(documentRepositoryProvider)
        .renameDocument(document.id, trimmed);
    bumpLibrary(ref);
  }

  Future<void> _reorder(Document document, int oldIndex, int newIndex) async {
    final repository = ref.read(documentRepositoryProvider);
    if (repository is! DocumentStore) return;
    AppHaptics.selection();
    await repository.reorderPages(document.id, oldIndex, newIndex);
    bumpLibrary(ref);
  }

  Future<void> _deletePage(Document document, ScanPage page) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete this page?'),
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

    await ref
        .read(documentRepositoryProvider)
        .deletePage(documentId: document.id, pagePath: page.path);
    AppHaptics.success();
    bumpLibrary(ref);
    if (mounted && document.pageCount <= 1) context.pop();
  }

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }
}

/// Title and the document's vitals, stacked in the bar.
///
/// The page count and date used to sit in a separate strip under the app bar,
/// which spent a whole row of a small screen on two facts.
class _TitleBlock extends StatelessWidget {
  const _TitleBlock({required this.document});

  final Document document;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          document.title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: theme.textTheme.titleLarge,
        ),
        const SizedBox(height: 2),
        Text(
          '${document.pageCount} page'
          '${document.pageCount == 1 ? '' : 's'} · '
          '${DateFormat.yMMMd().format(document.createdAt)}',
          style: theme.textTheme.labelSmall,
        ),
      ],
    );
  }
}

/// The two things you do to a finished document.
///
/// Adding a page was a bare 54pt square with a plus in it, sitting next to a
/// labelled button — the shape of an action nobody knows the name of.
class _ActionBar extends StatelessWidget {
  const _ActionBar({
    required this.busy,
    required this.onAddPage,
    required this.onExport,
  });

  final bool busy;
  final VoidCallback onAddPage;
  final VoidCallback onExport;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      decoration: BoxDecoration(
        color: theme.brightness == Brightness.light
            ? Colors.white
            : theme.colorScheme.surfaceContainerHigh,
        border: Border(
          top: BorderSide(color: theme.colorScheme.outlineVariant),
        ),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
          child: Row(
            children: [
              // 3:4 rather than 1:2 — at the narrower split "Add page" wrapped
              // onto two lines, which is worse than Export losing a little
              // width.
              Expanded(
                flex: 3,
                child: TactileButton(
                  label: 'Add page',
                  icon: Icons.add_rounded,
                  filled: false,
                  onPressed: busy ? null : onAddPage,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 4,
                child: TactileButton(
                  label: 'Export',
                  icon: Icons.ios_share_rounded,
                  haptic: AppHaptic.impactMedium,
                  onPressed: busy ? null : onExport,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PageCard extends StatelessWidget {
  const _PageCard({
    super.key,
    required this.documentId,
    required this.page,
    required this.index,
    required this.onEdit,
    required this.onDelete,
  });

  final int documentId;
  final ScanPage page;
  final int index;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    final thumbnail = SizedBox(
      width: 68,
      height: 90,
      child: PaperSheet(
        radius: 10,
        lift: 0.7,
        child: PageThumbnail(path: page.path, cacheWidth: 204, seed: index + 1),
      ),
    );

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: PressableScale(
        onPressed: onEdit,
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
            border: Border.all(color: scheme.outlineVariant),
          ),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                // Only page one flies from the library tile — it is the page
                // the tile was showing.
                if (index == 0)
                  Hero(tag: 'document-$documentId', child: thumbnail)
                else
                  thumbnail,
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Page ${index + 1}',
                        style: theme.textTheme.titleMedium,
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          Icon(
                            Icons.auto_fix_high_rounded,
                            size: 14,
                            color: scheme.primary,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            'Crop and enhance',
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: scheme.primary,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                TactileIconButton(
                  icon: Icons.delete_outline_rounded,
                  tooltip: 'Delete page',
                  color: scheme.onSurfaceVariant,
                  onPressed: onDelete,
                ),
                ReorderableDragStartListener(
                  index: index,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 4,
                      vertical: 12,
                    ),
                    child: Icon(
                      Icons.drag_indicator_rounded,
                      color: scheme.onSurfaceVariant,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
