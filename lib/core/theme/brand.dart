import 'package:flutter/material.dart';

/// Design tokens taken from the Scanella mockups.
///
/// Values are named after their role rather than their hue so screens read as
/// intent ("brand", "ink") and a palette change lands in one place.
class Brand {
  const Brand._();

  /// The bundled type face. One family, five weights, carrying every screen
  /// from the welcome hero down to a settings caption — the single change
  /// that stops the app reading as a stock Material template.
  ///
  /// Glyphs outside its coverage (CJK, Arabic, Indic) fall through to the
  /// platform face automatically, so a Japanese or Hindi locale still renders.
  static const font = 'PlusJakartaSans';

  /// The green used for primary buttons, links, the scan target and the
  /// accent half of the wordmark.
  ///
  /// Deep rather than bright on purpose, for three reasons. White 15.5px bold
  /// sits on this in every filled button, and it clears 9:1. The product is
  /// white paper, so an accent that recedes lets the scan stay the brightest
  /// thing on screen — the customer opened the app to look at their page, not
  /// at a button. And a neon green is the worst version of this hue on the one
  /// screen that matters: against the dark camera view it blooms, thickening
  /// the very edge the overlay is drawing to show you where the page is.
  static const accent = Color(0xFF0E5433);
  static const accentDark = Color(0xFF0A4127);

  /// A lift of the accent, for the top stop of the app-mark gradient.
  static const accentBright = Color(0xFF1B7249);

  /// Near-black navy used for headings and the first half of the wordmark.
  static const ink = Color(0xFF0B1B3F);
  static const inkSoft = Color(0xFF16264D);

  /// Body copy and secondary labels.
  static const grey = Color(0xFF6B7385);
  static const greyLight = Color(0xFF9AA1B1);

  /// Page and card surfaces.
  static const surface = Color(0xFFFFFFFF);
  static const canvas = Color(0xFFF7F9FC);

  /// Input and card outlines.
  static const outline = Color(0xFFE3E8F0);
  static const outlineStrong = Color(0xFFC9D2E0);

  /// Tints of the accent, for containers and selected states.
  static const accentWash = Color(0xFFECF9F3);
  static const accentTint = Color(0xFFD0F2E2);

  /// Dark-mode counterparts. The app is used at night, on a sofa, scanning a
  /// receipt — a white flash there is the least premium thing a phone can do.
  static const inkCanvas = Color(0xFF0C1424);
  static const inkSurface = Color(0xFF131D30);
  static const inkSurfaceHigh = Color(0xFF1B263C);
  static const inkOutline = Color(0xFF27334A);
  static const accentLight = Color(0xFF81CFAB);
  static const greyOnDark = Color(0xFF9AA5BD);
  static const paperOnDark = Color(0xFFE8ECF6);

  /// Accents used by the file chips in the hero illustrations.
  static const pdfRed = Color(0xFFE8443A);
  static const docBlue = Color(0xFF2C7BE5);
  static const imageGreen = Color(0xFF16A75C);
  static const cloudBlue = Color(0xFF3A8DFF);

  /// "Nearly there" in the camera overlay. Material's stock amber sits too
  /// close to the brand green to read as a separate state.
  static const amber = Color(0xFFF5A524);

  static const radiusField = 16.0;
  static const radiusButton = 16.0;
  static const radiusCard = 20.0;
  static const radiusSheet = 28.0;
  static const fieldHeight = 58.0;
  static const buttonHeight = 58.0;
}

/// The "Scanella" wordmark: navy "Scan", green "ella".
class ScanellaWordmark extends StatelessWidget {
  const ScanellaWordmark({super.key, this.fontSize = 44});

  final double fontSize;

  @override
  Widget build(BuildContext context) {
    // Named explicitly rather than inherited: a styled span carries whatever
    // family its own style names, so a wordmark that leans on the ambient
    // default is the one place the brand face would silently not apply.
    final style = TextStyle(
      fontFamily: Brand.font,
      fontSize: fontSize,
      fontWeight: FontWeight.w800,
      letterSpacing: -1.0,
      height: 1.05,
    );
    // Taken from the scheme rather than pinned to the tokens: in light these
    // resolve to exactly the mockup's navy and green, and in dark the mark
    // stays readable instead of printing navy onto navy.
    final scheme = Theme.of(context).colorScheme;
    return Text.rich(
      TextSpan(
        style: style.copyWith(color: scheme.onSurface),
        children: [
          const TextSpan(text: 'Scan'),
          TextSpan(
            text: 'ella',
            style: style.copyWith(color: scheme.primary),
          ),
        ],
      ),
      textAlign: TextAlign.center,
    );
  }
}

/// The rounded app mark: a green tile holding a flatbed scanner.
class ScanellaAppMark extends StatelessWidget {
  const ScanellaAppMark({super.key, this.size = 116});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(size * 0.235),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Brand.accentBright, Brand.accent],
        ),
        boxShadow: [
          BoxShadow(
            color: Brand.accent.withValues(alpha: 0.30),
            blurRadius: 22,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Padding(
        padding: EdgeInsets.all(size * 0.19),
        child: CustomPaint(painter: _ScannerMarkPainter()),
      ),
    );
  }
}

/// A flatbed scanner: a lid above, a body below, a sheet showing through.
class _ScannerMarkPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final white = Paint()..color = Colors.white;
    final shade = Paint()..color = const Color(0xFFD9E2F2);
    final r = Radius.circular(size.width * 0.09);

    // Lid.
    final lid = RRect.fromRectAndRadius(
      Rect.fromLTWH(
        size.width * 0.06,
        0,
        size.width * 0.88,
        size.height * 0.40,
      ),
      r,
    );
    canvas.drawRRect(lid, white);
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(
          size.width * 0.14,
          size.height * 0.07,
          size.width * 0.72,
          size.height * 0.24,
        ),
        Radius.circular(size.width * 0.05),
      ),
      shade,
    );

    // Body.
    final body = RRect.fromRectAndRadius(
      Rect.fromLTWH(0, size.height * 0.46, size.width, size.height * 0.42),
      r,
    );
    canvas.drawRRect(body, white);

    // Glass with the page on it.
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(
          size.width * 0.10,
          size.height * 0.52,
          size.width * 0.80,
          size.height * 0.22,
        ),
        Radius.circular(size.width * 0.04),
      ),
      Paint()..color = const Color(0xFF12306B),
    );

    // Status lights.
    canvas.drawCircle(
      Offset(size.width * 0.74, size.height * 0.81),
      size.width * 0.033,
      Paint()..color = const Color(0xFF35C759),
    );
    canvas.drawCircle(
      Offset(size.width * 0.85, size.height * 0.81),
      size.width * 0.033,
      Paint()..color = Brand.accent,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Primary full-width action button from the mockups: solid green, bold label,
/// optional trailing arrow.
class BrandButton extends StatelessWidget {
  const BrandButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.showArrow = true,
    this.busy = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool showArrow;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: Brand.buttonHeight,
      child: FilledButton(
        onPressed: busy ? null : onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: Brand.accent,
          foregroundColor: Colors.white,
          disabledBackgroundColor: Brand.accent.withValues(alpha: 0.45),
          disabledForegroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(Brand.radiusButton),
          ),
        ),
        child: busy
            ? const SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(
                  strokeWidth: 2.4,
                  color: Colors.white,
                ),
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    label,
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  if (showArrow) ...[
                    const SizedBox(width: 10),
                    const Icon(Icons.arrow_forward_rounded, size: 21),
                  ],
                ],
              ),
      ),
    );
  }
}

/// Bordered text field matching the mockups: leading grey icon, hint text,
/// generous height.
class BrandField extends StatelessWidget {
  const BrandField({
    super.key,
    required this.hint,
    required this.icon,
    this.controller,
    this.obscure = false,
    this.keyboardType,
    this.textCapitalization = TextCapitalization.none,
    this.trailing,
    this.validator,
    this.autofillHints,
  });

  final String hint;
  final IconData icon;
  final TextEditingController? controller;
  final bool obscure;
  final TextInputType? keyboardType;
  final TextCapitalization textCapitalization;
  final Widget? trailing;
  final String? Function(String?)? validator;
  final Iterable<String>? autofillHints;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      obscureText: obscure,
      keyboardType: keyboardType,
      textCapitalization: textCapitalization,
      validator: validator,
      autofillHints: autofillHints,
      style: const TextStyle(fontSize: 16, color: Brand.ink),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: Brand.greyLight, fontSize: 16),
        prefixIcon: Padding(
          padding: const EdgeInsets.only(left: 16, right: 12),
          child: Icon(icon, size: 21, color: Brand.greyLight),
        ),
        prefixIconConstraints: const BoxConstraints(minWidth: 0, minHeight: 0),
        suffixIcon: trailing,
        filled: true,
        fillColor: Brand.surface,
        contentPadding: const EdgeInsets.symmetric(vertical: 19),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(Brand.radiusField),
          borderSide: const BorderSide(color: Brand.outline),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(Brand.radiusField),
          borderSide: const BorderSide(color: Brand.accent, width: 1.6),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(Brand.radiusField),
          borderSide: const BorderSide(color: Brand.pdfRed),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(Brand.radiusField),
          borderSide: const BorderSide(color: Brand.pdfRed, width: 1.6),
        ),
      ),
    );
  }
}
