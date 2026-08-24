import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:scan2/core/theme/app_theme.dart';
import 'package:scan2/core/theme/brand.dart';
import 'package:scan2/core/widgets/illustrations.dart';

/// Screen 1 — the first thing a new install shows.
class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Pinned light. These screens are drawn straight from the design pack —
    // ink navy on a pale canvas, hardcoded — so under a dark theme their text
    // would be light-on-light. Committing to the light theme keeps the intro
    // looking like the mockups it came from, and legible either way.
    return Theme(
      data: AppTheme.light,
      child: Scaffold(
        backgroundColor: Brand.canvas,
        body: SafeArea(
          child: LayoutBuilder(
            builder: (context, constraints) {
              return SingleChildScrollView(
                child: ConstrainedBox(
                  constraints: BoxConstraints(minHeight: constraints.maxHeight),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(24, 8, 24, 28),
                    child: Column(
                      children: [
                        const SizedBox(height: 18),
                        const ScanellaAppMark(size: 112),
                        const SizedBox(height: 20),
                        const ScanellaWordmark(fontSize: 46),
                        const SizedBox(height: 10),
                        // One promise. "Document Scanner", a divider dot, and
                        // two taglines all said the same thing before any
                        // content appeared, and the dot read as a broken page
                        // indicator.
                        const Text(
                          'Scan anything.\nNothing leaves your phone.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 17,
                            height: 1.4,
                            color: Brand.grey,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 8),
                        SizedBox(
                          height: 312,
                          child: HeroStage(
                            centre: const ScannerDevice(),
                            chips: const [
                              HeroChip(
                                x: 0.13,
                                y: 0.30,
                                icon: Icons.picture_as_pdf_rounded,
                                color: Brand.pdfRed,
                                label: 'PDF',
                              ),
                              HeroChip(
                                x: 0.88,
                                y: 0.38,
                                icon: Icons.auto_fix_high_rounded,
                                color: Brand.accent,
                              ),
                              HeroChip(
                                x: 0.09,
                                y: 0.60,
                                icon: Icons.image_rounded,
                                color: Brand.imageGreen,
                              ),
                              // Was a cloud. There is no cloud — the whole
                              // point of the app is that there isn't one.
                              HeroChip(
                                x: 0.87,
                                y: 0.70,
                                icon: Icons.lock_rounded,
                                color: Brand.accent,
                              ),
                            ],
                          ),
                        ),
                        const Spacer(),
                        const SizedBox(height: 12),
                        BrandButton(
                          label: 'Get Started',
                          onPressed: () => context.go('/onboarding'),
                        ),
                        const SizedBox(height: 14),
                        _FooterPrompt(
                          prompt: 'Already have an account?',
                          action: 'Login',
                          onTap: () => context.go('/login'),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}

/// "Already have an account? Login" — the split-colour prompt used on the
/// welcome, sign-up and login screens.
class _FooterPrompt extends StatelessWidget {
  const _FooterPrompt({
    required this.prompt,
    required this.action,
    required this.onTap,
  });

  final String prompt;
  final String action;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(prompt, style: const TextStyle(color: Brand.grey, fontSize: 15)),
        const SizedBox(width: 5),
        GestureDetector(
          onTap: onTap,
          child: Text(
            action,
            style: const TextStyle(
              color: Brand.accent,
              fontSize: 15,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ],
    );
  }
}

/// Shared by the auth screens so the prompt style stays identical.
class AuthFooterPrompt extends StatelessWidget {
  const AuthFooterPrompt({
    super.key,
    required this.prompt,
    required this.action,
    required this.onTap,
  });

  final String prompt;
  final String action;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) =>
      _FooterPrompt(prompt: prompt, action: action, onTap: onTap);
}
