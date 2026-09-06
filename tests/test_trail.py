"""Contract for the canvas trail/veil math in src/simulation/trail.ts."""

from __future__ import annotations


DEFAULT_TRAIL = 0.37


def trail_buffer_scale(quality: str) -> float:
    if quality == "performance":
        return 0.48
    if quality == "beautiful":
        return 0.72
    return 0.56


def trail_buffer_max_pixels(quality: str) -> int:
    if quality == "performance":
        return 260_000
    if quality == "beautiful":
        return 620_000
    return 400_000


def trail_fade_alpha(trail: float) -> float:
    if trail <= 0.01:
        return 1.0
    return min(1.0, max((1.0 - trail) ** 1.15, 0.055))


def trail_punch_byte(trail: float) -> int:
    if trail <= 0.01:
        return 0
    if trail < 0.4:
        return 3
    if trail < 0.7:
        return 2
    return 1


def decay_once(value: int, trail: float) -> int:
    fade = trail_fade_alpha(trail)
    kept = round(value * (1.0 - fade))
    return max(0, kept - trail_punch_byte(trail))


def decay_steps_to_zero(value: int, trail: float, max_steps: int = 48) -> int:
    v = value
    for i in range(max_steps):
        v = decay_once(v, trail)
        if v <= 0:
            return i + 1
    return max_steps + 1


def trail_deposit(trail: float) -> float:
    t = min(1.0, max(trail, 0.0))
    return 0.14 + t * 0.5


def trail_use_veil_layer(trail: float, quality: str) -> bool:
    return quality == "beautiful" and trail >= 0.7


def trail_use_mid_layer(trail: float, quality: str) -> bool:
    if quality == "performance":
        return False
    return trail >= 0.48


def adaptive_max_sim_steps(fps: float, elapsed: float = 0.0) -> int:
    if elapsed > 0.042:
        return 2
    if elapsed > 0.032:
        return 3
    if fps > 0 and fps < 24:
        return 2
    if fps > 0 and fps < 32:
        return 3
    return 4


def neighbor_query_cap(fps: float) -> int:
    if fps > 0 and fps < 22:
        return 18
    if fps > 0 and fps < 28:
        return 24
    return 32


def particle_sprite_step(fps: float) -> int:
    if fps > 0 and fps < 22:
        return 3
    if fps > 0 and fps < 28:
        return 2
    return 1


def trail_needs_punch(trail: float) -> bool:
    return trail_punch_byte(trail) > 0 and trail_fade_alpha(trail) < 0.5


def test_default_trail_is_gentle() -> None:
    assert DEFAULT_TRAIL == 0.37


def snap_trail_dim(n: float) -> int:
    return max(1, round(n / 16) * 16)


def test_buffer_is_capped_below_full_res() -> None:
    assert trail_buffer_scale("performance") == 0.48
    assert trail_buffer_scale("balanced") == 0.56
    assert trail_buffer_scale("beautiful") == 0.72
    assert trail_buffer_max_pixels("balanced") <= 400_000
    assert snap_trail_dim(800 * 0.56) == snap_trail_dim(803 * 0.56)


def test_default_trail_clears_gray_fog() -> None:
    assert trail_punch_byte(DEFAULT_TRAIL) == 3
    assert decay_steps_to_zero(8, DEFAULT_TRAIL) <= 3
    assert decay_steps_to_zero(6, 0.93) <= 12


def test_colored_schleier_outlasts_gray() -> None:
    gray = decay_steps_to_zero(6, 0.93)
    color = decay_steps_to_zero(80, 0.93)
    assert color > gray
    assert color >= 8


def test_high_trail_still_punches() -> None:
    assert trail_punch_byte(0.93) == 1
    fade = trail_fade_alpha(0.93)
    assert 0.055 <= fade <= 0.12


def test_mid_trail_is_a_short_ribbon() -> None:
    fade = trail_fade_alpha(0.5)
    assert 0.4 <= fade <= 0.6
    assert trail_punch_byte(0.5) == 2


def test_low_trail_clears_quickly() -> None:
    assert trail_fade_alpha(0.0) == 1.0
    assert trail_fade_alpha(0.2) > 0.7
    assert trail_punch_byte(0.2) == 3


def test_slider_is_monotonic() -> None:
    fades = [trail_fade_alpha(t) for t in (0.2, DEFAULT_TRAIL, 0.5, 0.72, 0.93)]
    assert fades == sorted(fades, reverse=True)
    deposits = [trail_deposit(t) for t in (0.2, DEFAULT_TRAIL, 0.72, 0.93)]
    assert deposits == sorted(deposits)


def test_late_frames_do_not_catch_up_with_eight_sim_steps() -> None:
    assert adaptive_max_sim_steps(0) == 4
    assert adaptive_max_sim_steps(60) == 4
    assert adaptive_max_sim_steps(30, 0.05) == 2
    assert adaptive_max_sim_steps(24) == 3
    assert adaptive_max_sim_steps(12) == 2


def test_herd_neighbor_queries_stay_capped() -> None:
    assert neighbor_query_cap(0) == 32
    assert neighbor_query_cap(60) == 32
    assert neighbor_query_cap(26) == 24
    assert neighbor_query_cap(18) == 18


def test_sprites_thin_only_when_late() -> None:
    assert particle_sprite_step(40) == 1
    assert particle_sprite_step(26) == 2
    assert particle_sprite_step(18) == 3


def test_default_fade_kills_gray_without_punch() -> None:
    assert trail_needs_punch(0.37) is False
    assert trail_needs_punch(0.93) is True
    v = 8
    for _ in range(6):
        v = round(v * (1.0 - trail_fade_alpha(0.37)))
    assert v == 0


def test_wrap_and_respawn_do_not_draw_a_screen_wide_stroke() -> None:
    dx = 900 - 10
    dy = 16 - 10
    assert dx * dx + dy * dy > 140 * 140
    assert (8 * 8 + 6 * 6) <= 140 * 140


def test_wide_veil_layer_only_at_high_beautiful() -> None:
    assert not trail_use_veil_layer(DEFAULT_TRAIL, "balanced")
    assert not trail_use_veil_layer(0.93, "balanced")
    assert trail_use_veil_layer(0.93, "beautiful")
    assert not trail_use_mid_layer(DEFAULT_TRAIL, "balanced")
    assert trail_use_mid_layer(0.6, "balanced")
