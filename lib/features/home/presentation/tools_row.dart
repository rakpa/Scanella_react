import 'package:flutter/material.dart';
import 'package:scan2/core/haptics/app_haptics.dart';
import 'package:scan2/core/theme/brand.dart';
import 'package:scan2/core/theme/tactile.dart';
import 'package:scan2/core/widgets/pressable_scale.dart';

/// The three ways into the app that are not the camera.
///
/// Scanning is the docked button in the bar and needs no card. These are the
/// routes people forget exist: the PDF a company emailed you, the receipt you
/// photographed last week, the page you need as text rather than as an image.
/// Buried in a menu they may as well not ship.
///
/// Each card is drawn rather than iconned. A tinted square with a glyph in it
/// is what every settings row in every app looks like; a small picture of the
/// thing that is about to happen — a sheet lifting out of a stack, a photo
/// becoming a page, lines of text pulling off a scan — reads at a glance and
/// gives the row somewhere for colour to live.
class ToolsRow extends StatelessWidget {
  const ToolsRow({
    super.key,
    required this.onImportFiles,
    required this.onImportPhotos,
    required this.onExtractText,
  });

  final VoidCallback onImportFiles;
  final VoidCallback onImportPhotos;
  final VoidCallback onExtractText;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 2, 20, 20),
      child: Row(
        children: [
          Expanded(
            child: _ToolCard(
              label: 'Import\nfiles',
              tint: Brand.pdfRed,
              art: _FilesArt(),
              onPressed: onImportFiles,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _ToolCard(
              label: 'From\nphotos',
              tint: Brand.imageGreen,
              art: _PhotosArt(),
              onPressed: onImportPhotos,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _ToolCard(
              label: 'Extract\ntext',
              tint: Brand.docBlue,
              art: _TextArt(),
              onPressed: onExtractText,
            ),
          ),
        ],
      ),
    );
  }
}

class _ToolCard extends StatelessWidget {
  const _ToolCard({
    required this.label,
    required this.tint,
    required this.art,
    required this.onPressed,
  });

  final String label;
  final Color tint;
  final Widget art;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final isLight = theme.brightness == Brightness.light;

    return PressableScale(
      onPressed: onPressed,
      haptic: AppHaptic.impactLight,
      scale: Tactile.pressScaleCard,
      borderRadius: BorderRadius.circular(Brand.radiusCard),
      minSize: 0,
      child: Container(
        padding: const EdgeInsets.fromLTRB(12, 14, 12, 12),
        decoration: BoxDecoration(
          color: isLight ? Colors.white : scheme.surface,
          borderRadius: BorderRadius.circular(Brand.radiusCard),
          border: Border.all(color: scheme.outlineVariant),
          boxShadow: isLight
              ? [
                  BoxShadow(
                    color: scheme.shadow.withValues(alpha: 0.05),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ]
              : const [],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              height: 44,
              width: double.infinity,
              child: CustomPaint(
                painter: _ArtPainter(art: art, tint: tint, paper: isLight),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              label,
              style: theme.textTheme.labelMedium?.copyWith(
                color: scheme.onSurface,
                fontWeight: FontWeight.w700,
                height: 1.25,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Marker types so each card can name its drawing without a painter subclass
/// per card.
class _FilesArt extends StatelessWidget {
  @override
  Widget build(BuildContext context) => const SizedBox.shrink();
}

class _PhotosArt extends StatelessWidget {
  @override
  Widget build(BuildContext context) => const SizedBox.shrink();
}

class _TextArt extends StatelessWidget {
  @override
  Widget build(BuildContext context) => const SizedBox.shrink();
}

class _ArtPainter extends CustomPainter {
  _ArtPainter({required this.art, required this.tint, required this.paper});

  final Widget art;
  final Color tint;
  final bool paper;

  Color get _sheet => paper ? Colors.white : const Color(0xFFE9ECF4);
  Color get _sheetEdge => paper
      ? const Color(0xFF0B1B3F).withValues(alpha: 0.16)
      : const Color(0xFF0B1B3F).withValues(alpha: 0.35);
  Color get _rule => const Color(0xFF6B7385).withValues(alpha: 0.38);

  void _sheetRect(Canvas canvas, Rect rect, {double rotation = 0}) {
    canvas.save();
    canvas.translate(rect.center.dx, rect.center.dy);
    canvas.rotate(rotation);
    canvas.translate(-rect.center.dx, -rect.center.dy);
    final rrect = RRect.fromRectAndRadius(rect, const Radius.circular(3));
    canvas.drawRRect(
      rrect,
      Paint()
        ..color = const Color(0xFF0B1B3F).withValues(alpha: 0.10)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 3),
    );
    canvas.drawRRect(rrect, Paint()..color = _sheet);
    canvas.drawRRect(
      rrect,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1
        ..color = _sheetEdge,
    );
    canvas.restore();
  }

  void _lines(Canvas canvas, Rect within, int count, {Color? color}) {
    final paint = Paint()..color = color ?? _rule;
    final gap = within.height / (count + 1);
    for (var i = 0; i < count; i++) {
      final y = within.top + gap * (i + 1);
      final w = within.width * (i.isEven ? 0.82 : 0.6);
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(within.left, y, w, 1.8),
          const Radius.circular(1),
        ),
        paint,
      );
    }
  }

  @override
  void paint(Canvas canvas, Size size) {
    final h = size.height;
    final cx = size.width / 2;

    if (art is _FilesArt) {
      // A sheet lifting off a stack.
      _sheetRect(canvas, Rect.fromLTWH(cx - 20, h * 0.30, 26, h * 0.62));
      _sheetRect(canvas, Rect.fromLTWH(cx - 13, h * 0.22, 26, h * 0.62));
      final front = Rect.fromLTWH(cx - 4, h * 0.10, 26, h * 0.62);
      _sheetRect(canvas, front, rotation: 0.12);
      _lines(canvas, front.deflate(5).translate(0, -2), 3);
      // A file-type tag rather than a coloured blob: at this size a plain
      // rectangle says nothing, so it gets the label it would carry in a
      // file browser.
      final badge = RRect.fromRectAndRadius(
        Rect.fromLTWH(cx + 1, h * 0.52, 22, 12),
        const Radius.circular(3),
      );
      canvas.drawRRect(badge, Paint()..color = tint);
      final label = TextPainter(
        text: const TextSpan(
          text: 'PDF',
          style: TextStyle(
            fontFamily: Brand.font,
            fontSize: 7,
            height: 1,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.2,
            color: Colors.white,
          ),
        ),
        textDirection: TextDirection.ltr,
      )..layout();
      label.paint(
        canvas,
        Offset(
          badge.outerRect.center.dx - label.width / 2,
          badge.outerRect.center.dy - label.height / 2,
        ),
      );
    } else if (art is _PhotosArt) {
      // A photo turning into a page: image on the left, sheet on the right.
      final photo = Rect.fromLTWH(cx - 22, h * 0.24, 24, h * 0.52);
      canvas.drawRRect(
        RRect.fromRectAndRadius(photo, const Radius.circular(3)),
        Paint()..color = tint.withValues(alpha: 0.22),
      );
      // A hill and a sun, small enough to read as "photo" at 24px.
      canvas.drawCircle(
        Offset(photo.left + 7, photo.top + 7),
        2.6,
        Paint()..color = tint,
      );
      final hill = Path()
        ..moveTo(photo.left + 2, photo.bottom - 3)
        ..lineTo(photo.left + 9, photo.bottom - 11)
        ..lineTo(photo.left + 15, photo.bottom - 3)
        ..close();
      canvas.drawPath(hill, Paint()..color = tint);
      canvas.drawRRect(
        RRect.fromRectAndRadius(photo, const Radius.circular(3)),
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1
          ..color = tint.withValues(alpha: 0.55),
      );
      final sheet = Rect.fromLTWH(cx + 2, h * 0.16, 24, h * 0.66);
      _sheetRect(canvas, sheet);
      _lines(canvas, sheet.deflate(5), 4);
      // The arrow between them.
      final arrow = Paint()
        ..color = tint
        ..strokeWidth = 1.6
        ..strokeCap = StrokeCap.round;
      canvas.drawLine(
        Offset(cx - 5, h * 0.52),
        Offset(cx - 1, h * 0.52),
        arrow,
      );
      canvas.drawLine(
        Offset(cx - 3.2, h * 0.52 - 2),
        Offset(cx - 1, h * 0.52),
        arrow,
      );
      canvas.drawLine(
        Offset(cx - 3.2, h * 0.52 + 2),
        Offset(cx - 1, h * 0.52),
        arrow,
      );
    } else {
      // Lines of text pulling off a scan.
      final sheet = Rect.fromLTWH(cx - 20, h * 0.14, 26, h * 0.70);
      _sheetRect(canvas, sheet);
      _lines(canvas, sheet.deflate(5), 5);
      // Selected text, lifted clear of the page and set in the accent.
      final chip = RRect.fromRectAndRadius(
        Rect.fromLTWH(cx - 2, h * 0.32, 24, h * 0.40),
        const Radius.circular(4),
      );
      canvas.drawRRect(
        chip,
        Paint()
          ..color = const Color(0xFF0B1B3F).withValues(alpha: 0.12)
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 3),
      );
      canvas.drawRRect(chip, Paint()..color = tint.withValues(alpha: 0.16));
      canvas.drawRRect(
        chip,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1
          ..color = tint.withValues(alpha: 0.7),
      );
      _lines(canvas, chip.outerRect.deflate(4), 3, color: tint);
    }
  }

  @override
  bool shouldRepaint(covariant _ArtPainter old) =>
      old.tint != tint || old.paper != paper || old.art.runtimeType != art.runtimeType;
}
