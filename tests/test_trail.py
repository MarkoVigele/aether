"""Contract for the canvas trail/veil math in src/simulation/trail.ts."""

from __future__ import annotations


def trail_buffer_scale(quality: str) -> float:
    if quality == "performance":
        return 0.78
    return 1.0


def trail_fade_alpha(trail: float) -> float:
    if trail <= 0.01:
        return 1.0
    return min(1.0, max((1.0 - trail) ** 1.2, 0.018))


def trail_punch_byte(trail: float) -> int:
    if trail <= 0.01 or trail >= 0.68:
        return 0
    if trail < 0.38:
        return 3
    return 1


def trail_composite_contrast(trail: float) -> float:
    if trail >= 0.68:
        return 1.0
    if trail < 0.35:
        return 1.22
    return 1.08


def trail_segment_ok(x0: float, y0: float, x1: float, y1: float, limit: float = 140) -> bool:
    dx = x1 - x0
    dy = y1 - y0
    return dx * dx + dy * dy <= limit * limit


def trail_deposit(trail: float) -> float:
    t = min(1.0, max(trail, 0.0))
    return 0.12 + t * 0.55


def test_performance_buffer_is_cheaper_than_full_res() -> None:
    assert trail_buffer_scale("performance") == 0.78
    assert trail_buffer_scale("balanced") == 1.0
    assert trail_buffer_scale("beautiful") == 1.0


def test_high_trail_fades_slowly_without_punch() -> None:
    fade = trail_fade_alpha(0.93)
    assert 0.018 <= fade <= 0.06
    assert trail_punch_byte(0.93) == 0
    assert trail_composite_contrast(0.93) == 1.0


def test_mid_trail_is_a_short_ribbon() -> None:
    fade = trail_fade_alpha(0.5)
    assert 0.35 <= fade <= 0.55
    assert trail_punch_byte(0.5) == 1


def test_low_trail_clears_quickly() -> None:
    assert trail_fade_alpha(0.0) == 1.0
    assert trail_fade_alpha(0.2) > 0.7
    assert trail_punch_byte(0.2) == 3


def test_slider_is_monotonic() -> None:
    fades = [trail_fade_alpha(t) for t in (0.2, 0.5, 0.72, 0.93, 0.97)]
    assert fades == sorted(fades, reverse=True)
    deposits = [trail_deposit(t) for t in (0.2, 0.5, 0.72, 0.93)]
    assert deposits == sorted(deposits)


def test_wrap_and_respawn_do_not_draw_a_screen_wide_stroke() -> None:
    assert trail_segment_ok(10, 10, 18, 16)
    assert not trail_segment_ok(10, 10, 900, 16)
    assert not trail_segment_ok(0, 0, 0, 200)
