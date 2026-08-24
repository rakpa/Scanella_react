import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:scan2/core/theme/app_theme.dart';
import 'package:scan2/core/theme/brand.dart';
import 'package:scan2/features/camera/domain/native_document_scanner.dart';
import 'package:scan2/features/camera/domain/quad_detector.dart';
import 'package:scan2/features/crop/domain/image_processor.dart';
import 'package:scan2/features/crop/domain/page_processor.dart';
import 'package:scan2/features/library/data/document_store.dart';
import 'package:scan2/features/shared/providers/db_provider.dart';
import 'package:scan2/features/shared/providers/settings_provider.dart';

/// The default scanning screen: hands straight over to the platform's own
/// document scanner — VisionKit on iOS, ML Kit Document Scanner on Android.
///
/// Those are trained models maintained by Apple and Google, and they beat the
/// in-app geometric detector on exactly the awkward frames that matter: a
/// small card on a patterned surface, a page in poor light, a document held at
/// an angle. Scan2's own value is everything after the capture — enhancement,
/// multi-page documents, re-editable pages, export — so the capture step uses
/// whatever detects best on the device.
///
/// Pages come back already perspective-corrected, so they only need enhancing
/// and filing.
class NativeScanScreen extends ConsumerStatefulWidget {
  const NativeScanScreen({super.key});

  @override
  ConsumerState<NativeScanScreen> createState() => _NativeScanScreenState();
}

class _NativeScanScreenState extends ConsumerState<NativeScanScreen> {
  static const _scanner = NativeDocumentScanner();
  static const _processor = PageProcessor();

  String _status = 'Opening scanner…';
  String? _error;
  bool _launched = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _run());
  }

  Future<void> _run() async {
    if (_launched) return;
    _launched = true;

    if (kIsWeb) {
      setState(() => _error = 'Scanning needs a device camera.');
      return;
    }

    try {
      final pages = await _scanner.scan();

      // Cancelled from inside the system scanner.
      if (pages == null || pages.isEmpty) {
        if (mounted) context.pop();
        return;
      }

      if (!mounted) return;
      setState(
        () => _status = pages.length == 1
            ? 'Enhancing page…'
            : 'Enhancing ${pages.length} pages…',
      );

      final filter = ref.read(settingsProvider).defaultFilter;
      final processed = <ProcessedPage>[];
      for (final path in pages) {
        final result = await _processor.process(
          imagePath: path,
          // Already perspective-corrected by the platform scanner; running
          // edge detection again would only crop into the page.
          detectEdges: false,
          adjustments: ScanAdjustments(filter: filter),
        );
        processed.add(
          ProcessedPage(
            originalPath: path,
            bytes: result.bytes,
            // Recorded as full-frame so reopening the editor shows the page
            // as-is. Without it the crop screen would run detection on an
            // already-cropped page and crop a second time, into the content.
            quad: const Quad.fullFrame(),
            adjustments: result.adjustments,
          ),
        );
      }

      final repository = ref.read(documentRepositoryProvider);
      if (repository is! DocumentStore) {
        if (mounted) context.go('/library');
        return;
      }

      final doc = await repository.createProcessedDocument(pages: processed);
      bumpLibrary(ref);
      HapticFeedback.mediumImpact();

      if (!mounted) return;
      context.go('/library/document/${doc.id}');
    } catch (e) {
      debugPrint('Scan failed: $e');
      if (mounted) setState(() => _error = '$e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final error = _error;

    // Every scan passes through this screen twice — once handing off to the
    // system scanner, once coming back to be enhanced. It used to be a black
    // field with a white spinner on it, which is the screen an app shows when
    // nobody decided what it should be.
    return Theme(
      data: AppTheme.dark,
      child: Scaffold(
        backgroundColor: const Color(0xFF070D19),
        body: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: error == null
                  ? _Working(status: _status)
                  : _Failed(
                      message: error,
                      onRetry: () {
                        setState(() {
                          _error = null;
                          _launched = false;
                          _status = 'Opening scanner…';
                        });
                        _run();
                      },
                      onBack: () => context.go('/library'),
                    ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Working extends StatelessWidget {
  const _Working({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const ScanellaAppMark(size: 72),
        const SizedBox(height: 30),
        const SizedBox(
          width: 132,
          child: LinearProgressIndicator(
            minHeight: 3,
            borderRadius: BorderRadius.all(Radius.circular(3)),
          ),
        ),
        const SizedBox(height: 24),
        Text(
          status,
          textAlign: TextAlign.center,
          style: theme.textTheme.titleMedium,
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.lock_rounded,
              size: 13,
              color: theme.colorScheme.onSurfaceVariant,
            ),
            const SizedBox(width: 6),
            Text('Nothing leaves your device', style: theme.textTheme.bodySmall),
          ],
        ),
      ],
    );
  }
}

class _Failed extends StatelessWidget {
  const _Failed({
    required this.message,
    required this.onRetry,
    required this.onBack,
  });

  final String message;
  final VoidCallback onRetry;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 68,
          height: 68,
          decoration: BoxDecoration(
            color: theme.colorScheme.error.withValues(alpha: 0.16),
            shape: BoxShape.circle,
          ),
          child: Icon(
            Icons.error_outline_rounded,
            size: 32,
            color: theme.colorScheme.error,
          ),
        ),
        const SizedBox(height: 20),
        Text(
          'That scan did not finish',
          style: theme.textTheme.titleLarge,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 8),
        Text(
          message,
          textAlign: TextAlign.center,
          style: theme.textTheme.bodySmall,
        ),
        const SizedBox(height: 28),
        SizedBox(
          width: double.infinity,
          child: FilledButton(onPressed: onRetry, child: const Text('Try again')),
        ),
        const SizedBox(height: 6),
        TextButton(onPressed: onBack, child: const Text('Back to library')),
      ],
    );
  }
}
