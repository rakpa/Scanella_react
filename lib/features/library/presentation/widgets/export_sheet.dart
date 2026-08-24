import 'package:flutter/material.dart';
import 'package:scan2/core/haptics/app_haptics.dart';
import 'package:scan2/core/theme/brand.dart';
import 'package:scan2/core/theme/tactile.dart';
import 'package:scan2/core/widgets/pressable_scale.dart';
import 'package:scan2/features/library/domain/document.dart';
import 'package:scan2/features/library/domain/export_service.dart';

/// What the user picked in the export sheet.
enum ExportAction { savePdfToFiles, saveToPhotos, sharePdf, shareImages }

/// Bottom sheet listing the ways a document can leave the app.
///
/// Previously export was two unlabelled icons in the app bar that dropped
/// straight into the system share sheet, which gave no indication that saving
/// a PDF or writing to Photos was possible at all.
class ExportSheet extends StatelessWidget {
  const ExportSheet({super.key, required this.document});

  final Document document;

  static Future<ExportAction?> show(BuildContext context, Document document) {
    return showModalBottomSheet<ExportAction>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (context) => ExportSheet(document: document),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final pageCount = document.pageCount;
    final pageLabel = '$pageCount page${pageCount == 1 ? '' : 's'}';

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 0, 12, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Export', style: theme.textTheme.headlineSmall),
                  const SizedBox(height: 4),
                  Text(
                    '${document.title} · $pageLabel',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodySmall,
                  ),
                ],
              ),
            ),
            _ExportTile(
              icon: Icons.picture_as_pdf_rounded,
              tint: Brand.pdfRed,
              title: 'Save PDF to Files',
              subtitle: '$pageLabel in one document',
              action: ExportAction.savePdfToFiles,
              highlighted: true,
            ),
            const SizedBox(height: 8),
            _ExportTile(
              icon: Icons.photo_library_rounded,
              tint: Brand.amber,
              title: 'Save to Photos',
              subtitle: 'Adds the pages to a Scan2 album',
              action: ExportAction.saveToPhotos,
            ),
            const SizedBox(height: 8),
            _ExportTile(
              icon: Icons.ios_share_rounded,
              tint: Brand.docBlue,
              title: 'Share PDF',
              subtitle: 'Mail, Messages, or another app',
              action: ExportAction.sharePdf,
            ),
            const SizedBox(height: 8),
            _ExportTile(
              icon: Icons.image_rounded,
              tint: Brand.cloudBlue,
              title: 'Share page images',
              subtitle: 'One JPEG per page',
              action: ExportAction.shareImages,
            ),
          ],
        ),
      ),
    );
  }
}

/// One way out of the app.
///
/// Each route gets a coloured mark rather than a grey one — the red PDF badge
/// is how people recognise the option they want without reading the row, and
/// the sheet is the last screen before the customer's document goes to someone
/// who is not them.
class _ExportTile extends StatelessWidget {
  const _ExportTile({
    required this.icon,
    required this.tint,
    required this.title,
    required this.subtitle,
    required this.action,
    this.highlighted = false,
  });

  final IconData icon;
  final Color tint;
  final String title;
  final String subtitle;
  final ExportAction action;

  /// The route most people want, given the weight to match.
  final bool highlighted;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return PressableScale(
      onPressed: () => Navigator.pop(context, action),
      haptic: AppHaptic.impactLight,
      scale: Tactile.pressScaleCard,
      borderRadius: BorderRadius.circular(Brand.radiusField),
      minSize: 0,
      child: Container(
        decoration: BoxDecoration(
          color: highlighted
              ? scheme.primaryContainer
              : (theme.brightness == Brightness.light
                    ? scheme.surfaceContainer
                    : scheme.surfaceContainerLow),
          borderRadius: BorderRadius.circular(Brand.radiusField),
          border: Border.all(
            color: highlighted ? scheme.primary : scheme.outlineVariant,
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: tint.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(13),
                ),
                child: Icon(icon, size: 22, color: tint),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: theme.textTheme.titleSmall),
                    const SizedBox(height: 2),
                    Text(subtitle, style: theme.textTheme.labelSmall),
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right_rounded,
                size: 20,
                color: scheme.onSurfaceVariant,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Runs [action] for [document], returning a message to show the user.
///
/// Errors are returned rather than swallowed: an export that quietly does
/// nothing is indistinguishable from a broken button.
Future<String> runExportAction(
  ExportAction action,
  Document document,
  ExportService exporter,
) async {
  switch (action) {
    case ExportAction.savePdfToFiles:
      await exporter.savePdfToFiles(document);
      return 'Choose a location to save the PDF';
    case ExportAction.saveToPhotos:
      final saved = await exporter.saveToPhotos(document);
      return 'Saved $saved page${saved == 1 ? '' : 's'} to Photos';
    case ExportAction.sharePdf:
      await exporter.sharePdf(document);
      return '';
    case ExportAction.shareImages:
      await exporter.shareImages(document);
      return '';
  }
}
