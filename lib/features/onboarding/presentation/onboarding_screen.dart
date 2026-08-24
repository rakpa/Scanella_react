import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:scan2/core/theme/app_theme.dart';
import 'package:scan2/core/theme/brand.dart';
import 'package:scan2/core/widgets/illustrations.dart';
import 'package:scan2/features/shared/providers/onboarding_provider.dart';

/// Screens 2–3 — the three-page introduction.
class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final _controller = PageController();
  int _page = 0;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _finish() {
    ref.read(onboardingCompletedProvider.notifier).complete();
    // Straight into the library. An account buys nothing here — there is no
    // server behind it — and a wall in front of an offline scanner is the
    // most expensive screen the app could show.
    context.go('/library');
  }

  void _next() {
    if (_page >= _pages.length - 1) {
      _finish();
      return;
    }
    _controller.nextPage(
      duration: const Duration(milliseconds: 320),
      curve: Curves.easeOutCubic,
    );
  }

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
          child: Column(
            children: [
              Align(
                alignment: Alignment.centerRight,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(0, 4, 20, 0),
                  child: TextButton(
                    onPressed: _finish,
                    child: const Text(
                      'Skip',
                      style: TextStyle(
                        color: Brand.accent,
                        fontSize: 17,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ),
              Expanded(
                child: PageView.builder(
                  controller: _controller,
                  itemCount: _pages.length,
                  onPageChanged: (index) => setState(() => _page = index),
                  itemBuilder: (context, index) =>
                      _OnboardingPage(page: _pages[index]),
                ),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  for (var i = 0; i < _pages.length; i++)
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 220),
                      margin: const EdgeInsets.symmetric(horizontal: 4),
                      width: i == _page ? 10 : 9,
                      height: i == _page ? 10 : 9,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: i == _page ? Brand.accent : Brand.outline,
                      ),
                    ),
                ],
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 22, 24, 16),
                child: BrandButton(
                  label: _page == _pages.length - 1 ? 'Get Started' : 'Next',
                  onPressed: _next,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _OnboardingPage extends StatelessWidget {
  const _OnboardingPage({required this.page});

  final _PageData page;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          Container(
            width: 76,
            height: 76,
            decoration: BoxDecoration(
              color: Brand.surface,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: Brand.ink.withValues(alpha: 0.08),
                  blurRadius: 18,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Icon(page.badge, size: 36, color: Brand.accent),
          ),
          const SizedBox(height: 22),
          _SplitHeadline(lead: page.headlineLead, accent: page.headlineAccent),
          const SizedBox(height: 14),
          Text(
            page.body,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 16,
              color: Brand.grey,
              height: 1.45,
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(height: 330, child: page.illustration),
        ],
      ),
    );
  }
}

/// Headline where the last word or two carries the blue accent.
class _SplitHeadline extends StatelessWidget {
  const _SplitHeadline({required this.lead, required this.accent});

  final String lead;
  final String accent;

  @override
  Widget build(BuildContext context) {
    const style = TextStyle(
      fontFamily: Brand.font,
      fontSize: 33,
      fontWeight: FontWeight.w800,
      height: 1.22,
      letterSpacing: -0.6,
    );
    return Text.rich(
      TextSpan(
        style: style.copyWith(color: Brand.ink),
        children: [
          TextSpan(text: lead),
          TextSpan(
            text: accent,
            style: style.copyWith(color: Brand.accent),
          ),
        ],
      ),
      textAlign: TextAlign.center,
    );
  }
}

class _PageData {
  const _PageData({
    required this.badge,
    required this.headlineLead,
    required this.headlineAccent,
    required this.body,
    required this.illustration,
  });

  final IconData badge;
  final String headlineLead;
  final String headlineAccent;
  final String body;
  final Widget illustration;
}

final _pages = <_PageData>[
  const _PageData(
    badge: Icons.document_scanner_rounded,
    headlineLead: 'Scan Anything\nin a ',
    headlineAccent: 'Snap',
    body:
        'Turn your phone into a powerful scanner.\n'
        'Fast, clear and easy.',
    illustration: HeroStage(
      centre: ScanningPhone(),
      chips: [
        HeroChip(
          x: 0.10,
          y: 0.36,
          icon: Icons.description_rounded,
          color: Brand.accent,
        ),
        HeroChip(
          x: 0.90,
          y: 0.32,
          icon: Icons.picture_as_pdf_rounded,
          color: Brand.pdfRed,
          label: 'PDF',
        ),
        HeroChip(
          x: 0.10,
          y: 0.72,
          icon: Icons.qr_code_2_rounded,
          color: Brand.imageGreen,
          label: 'OCR',
        ),
        HeroChip(
          x: 0.90,
          y: 0.64,
          icon: Icons.lock_rounded,
          color: Brand.accent,
        ),
      ],
    ),
  ),
  // Middle page: the design pack did not include this one, so it covers the
  // step between capturing and privacy — what the app does with a scan.
  const _PageData(
    badge: Icons.auto_fix_high_rounded,
    // No comma: at this size Plus Jakarta Sans leaves a visible gap before
    // it, and the sibling page sets no punctuation either.
    headlineLead: 'Clean Pages\n',
    headlineAccent: 'Every Time',
    body:
        'Edges are straightened and pages enhanced\n'
        'automatically. Export as PDF or images.',
    illustration: HeroStage(
      centre: ScannerDevice(),
      chips: [
        HeroChip(
          x: 0.10,
          y: 0.32,
          icon: Icons.crop_rounded,
          color: Brand.accent,
        ),
        HeroChip(x: 0.90, y: 0.36, icon: Icons.tune_rounded, color: Brand.accent),
        HeroChip(
          x: 0.11,
          y: 0.70,
          icon: Icons.picture_as_pdf_rounded,
          color: Brand.pdfRed,
          label: 'PDF',
        ),
        HeroChip(
          x: 0.89,
          y: 0.72,
          icon: Icons.ios_share_rounded,
          color: Brand.imageGreen,
        ),
      ],
    ),
  ),
];
