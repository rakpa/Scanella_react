import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:scan2/core/haptics/app_haptics.dart';
import 'package:scan2/core/theme/tactile.dart';
import 'package:scan2/core/widgets/pressable_scale.dart';
import 'package:scan2/features/library/presentation/documents_view.dart';
import 'package:scan2/features/settings/presentation/settings_screen.dart';

/// The app shell: a bottom bar with a docked scan button.
///
/// Every established scanner app is built around this shape — a persistent bar
/// with capture as a raised, centred target rather than a corner FAB. It puts
/// the one action people opened the app for under the thumb, and gives the
/// rest of the app somewhere to live.
class HomeShell extends ConsumerStatefulWidget {
  const HomeShell({super.key});

  @override
  ConsumerState<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends ConsumerState<HomeShell> {
  int _tab = 0;

  void _select(int tab) {
    if (_tab == tab) return;
    setState(() => _tab = tab);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return Scaffold(
      extendBody: true,
      body: IndexedStack(
        index: _tab,
        children: const [DocumentsView(), SettingsScreen(embedded: true)],
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      floatingActionButton: _ScanButton(
        onPressed: () => context.push('/camera'),
      ),
      bottomNavigationBar: DecoratedBox(
        decoration: BoxDecoration(
          // A hairline seats the bar; the shadow only lifts it. The old bar
          // used shadow alone, which on a tinted canvas reads as a smudge
          // rather than an edge.
          border: Border(top: BorderSide(color: scheme.outlineVariant)),
          boxShadow: [
            BoxShadow(
              color: scheme.shadow.withValues(
                alpha: theme.brightness == Brightness.light ? 0.06 : 0.28,
              ),
              blurRadius: 20,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: BottomAppBar(
          padding: EdgeInsets.zero,
          shape: const CircularNotchedRectangle(),
          notchMargin: 10,
          child: Row(
            children: [
              Expanded(
                child: _NavItem(
                  icon: Icons.folder_outlined,
                  activeIcon: Icons.folder_rounded,
                  label: 'Documents',
                  selected: _tab == 0,
                  onTap: () => _select(0),
                ),
              ),
              const SizedBox(width: 84),
              Expanded(
                child: _NavItem(
                  icon: Icons.tune_outlined,
                  activeIcon: Icons.tune_rounded,
                  label: 'Settings',
                  selected: _tab == 1,
                  onTap: () => _select(1),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// The scan target.
///
/// It carries a white collar so the notch reads as deliberate on any
/// background, a gradient rather than a flat fill, and a press that actually
/// depresses — the single most-tapped control in the app is worth the frame.
class _ScanButton extends StatelessWidget {
  const _ScanButton({required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final barColor = theme.brightness == Brightness.light
        ? Colors.white
        : scheme.surfaceContainerHigh;

    return PressableScale(
      onPressed: onPressed,
      haptic: AppHaptic.impactMedium,
      // Heavier travel than a flat tile: this one is raised, so it should
      // read as being pushed down into the bar.
      scale: Tactile.pressScaleFab,
      overlay: false,
      child: Container(
        width: 68,
        height: 68,
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(shape: BoxShape.circle, color: barColor),
        child: DecoratedBox(
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Color.lerp(scheme.primary, Colors.white, 0.22) ??
                    scheme.primary,
                scheme.primary,
              ],
            ),
            // Kept tight: a wide coloured glow smears across the bar behind
            // it and reads as a rendering artefact rather than depth.
            boxShadow: [
              BoxShadow(
                color: scheme.primary.withValues(alpha: 0.36),
                blurRadius: 14,
                offset: const Offset(0, 5),
              ),
            ],
          ),
          child: Center(
            child: Icon(
              Icons.document_scanner_rounded,
              size: 28,
              color: scheme.onPrimary,
            ),
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final IconData activeIcon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final color = selected ? scheme.primary : scheme.onSurfaceVariant;

    return PressableScale(
      onPressed: onTap,
      haptic: AppHaptic.selection,
      scale: Tactile.pressScaleIcon,
      overlay: false,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              curve: Curves.easeOut,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 3),
              decoration: BoxDecoration(
                color: selected
                    ? scheme.primaryContainer
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(selected ? activeIcon : icon, size: 22, color: color),
            ),
            const SizedBox(height: 3),
            AnimatedDefaultTextStyle(
              duration: const Duration(milliseconds: 200),
              style:
                  theme.textTheme.labelSmall?.copyWith(
                    color: color,
                    fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
                  ) ??
                  const TextStyle(),
              child: Text(label),
            ),
          ],
        ),
      ),
    );
  }
}
