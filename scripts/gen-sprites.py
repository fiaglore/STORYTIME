#!/usr/bin/env python3
"""Generates public/sprites/*.png — the RpgMap player/NPC figurines.

Draws a simplified but recognizably human figure (head, neck, torso, bent
arms with hands, legs with shoes, face with eyes/brows/nose/mouth) rather
than the faceless blob-mascot shape these sprites started as. Variants are
built from the same draw_person() with different outfit colors, hair vs.
headwrap, and small pose differences (tray for the frying beat, angled
brows for the defiant beat).

Renders at 4x supersample then downscales once with LANCZOS — rendering
directly at the small final size and upscaling, or scaling down in two
steps, produced visible blur in an earlier pass; downscaling once from a
larger canvas avoids that.

Run from the repo root: python3 scripts/gen-sprites.py
Requires Pillow (`pip install pillow`).
"""

from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "public" / "sprites"

S = 4  # supersample factor
FINAL_W, FINAL_H = 192, 240
W, H = FINAL_W * S, FINAL_H * S


def px(v):
    return v * S


def draw_person(
    skin,
    outfit,
    outfit_dark,
    shoe=(30, 22, 18, 255),
    headwrap=None,
    headwrap_dark=None,
    hair=None,
    accessory=None,
    brow_angry=False,
    tray=False,
    walking=False,
):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = W // 2

    # shadow
    d.ellipse([cx - px(28), px(234), cx + px(28), px(240)], fill=(0, 0, 0, 40))

    # legs + shoes — a mid-stride pose (legs spread, one knee raised) swapped
    # in for the idle pose while the player is walking, as a 2-frame cycle.
    leg_top, leg_bot = px(150), px(222)
    if walking:
        d.rounded_rectangle([cx - px(23), leg_top - px(2), cx - px(9), leg_bot - px(12)], radius=px(5), fill=outfit_dark)
        d.rounded_rectangle([cx + px(9), leg_top + px(6), cx + px(23), leg_bot], radius=px(5), fill=outfit_dark)
        d.ellipse([cx - px(25), leg_bot - px(16), cx - px(7), leg_bot - px(6)], fill=shoe)
        d.ellipse([cx + px(7), leg_bot - px(4), cx + px(25), leg_bot + px(6)], fill=shoe)
    else:
        d.rounded_rectangle([cx - px(17), leg_top, cx - px(3), leg_bot], radius=px(5), fill=outfit_dark)
        d.rounded_rectangle([cx + px(3), leg_top, cx + px(17), leg_bot], radius=px(5), fill=outfit_dark)
        d.ellipse([cx - px(19), leg_bot - px(4), cx - px(1), leg_bot + px(6)], fill=shoe)
        d.ellipse([cx + px(1), leg_bot - px(4), cx + px(19), leg_bot + px(6)], fill=shoe)

    # torso: narrower shoulders, flares to a hem
    torso_top, torso_bot = px(96), px(156)
    d.polygon(
        [
            (cx - px(28), torso_top + px(8)),
            (cx + px(28), torso_top + px(8)),
            (cx + px(38), torso_bot),
            (cx - px(38), torso_bot),
        ],
        fill=outfit,
    )
    d.rounded_rectangle([cx - px(28), torso_top, cx + px(28), torso_top + px(26)], radius=px(12), fill=outfit)

    # arms, ending in hands — swing opposite the legs while walking
    for side in (-1, 1):
        sx = cx + side * px(32)
        arm_shift = (px(6) if side == -1 else -px(6)) if walking else 0
        d.rounded_rectangle(
            [sx - px(7), torso_top + px(10) + arm_shift, sx + px(7), torso_top + px(52) + arm_shift],
            radius=px(7), fill=skin,
        )
        d.ellipse(
            [sx - px(8), torso_top + px(46) + arm_shift, sx + px(8), torso_top + px(62) + arm_shift],
            fill=skin,
        )

    if tray:
        # a small round tray/bowl held at waist height, for the frying pose
        d.ellipse([cx - px(22), torso_top + px(44), cx + px(22), torso_top + px(60)], fill=(230, 200, 150, 255))
        d.ellipse([cx - px(18), torso_top + px(44), cx + px(18), torso_top + px(56)], fill=(120, 70, 30, 255))

    # neck
    d.rounded_rectangle([cx - px(8), torso_top - px(10), cx + px(8), torso_top + px(6)], radius=px(4), fill=skin)

    # head + ears
    head_top, head_bot = px(36), px(98)
    head_l, head_r = cx - px(23), cx + px(23)
    d.ellipse([head_l, head_top, head_r, head_bot], fill=skin)
    mid_y = (head_top + head_bot) / 2
    d.ellipse([head_l - px(4), mid_y - px(5), head_l + px(4), mid_y + px(7)], fill=skin)
    d.ellipse([head_r - px(4), mid_y - px(5), head_r + px(4), mid_y + px(7)], fill=skin)

    # hair or headwrap (drawn before the face so the face sits on top)
    if headwrap:
        d.pieslice([head_l - px(3), head_top - px(7), head_r + px(3), head_top + px(30)], 180, 360, fill=headwrap)
        d.rounded_rectangle(
            [head_l - px(3), head_top + px(9), head_r + px(3), head_top + px(23)],
            radius=px(8),
            fill=headwrap_dark or headwrap,
        )
        d.line(
            [head_l + px(6), head_top + px(2), head_r - px(6), head_top + px(14)],
            fill=headwrap_dark or headwrap,
            width=max(1, int(px(2))),
        )
        d.ellipse([head_r - px(6), head_top - px(4), head_r + px(12), head_top + px(10)], fill=headwrap)
    elif hair:
        d.pieslice([head_l - px(2), head_top - px(5), head_r + px(2), head_top + px(32)], 180, 360, fill=hair)
        d.rounded_rectangle([head_l - px(2), head_top + px(8), head_r + px(2), head_top + px(16)], radius=px(6), fill=hair)
        d.rectangle([head_l + px(1), head_top + px(10), head_l + px(5), head_top + px(22)], fill=hair)
        d.rectangle([head_r - px(5), head_top + px(10), head_r - px(1), head_top + px(22)], fill=hair)

    # face: eyes, brows, nose, mouth
    eye_y = head_top + px(26)
    for side in (-1, 1):
        ex = cx + side * px(9)
        d.ellipse([ex - px(2.6), eye_y - px(2.2), ex + px(2.6), eye_y + px(2.2)], fill=(30, 20, 15, 255))
        if brow_angry:
            brow_tilt = (-1 if side < 0 else 1) * px(2)
            d.line(
                [
                    ex - px(5),
                    eye_y - px(5) + (0 if side < 0 else brow_tilt),
                    ex + px(5),
                    eye_y - px(5) + (brow_tilt if side < 0 else 0),
                ],
                fill=(45, 28, 16, 255),
                width=max(1, int(px(1.8))),
            )
        else:
            d.arc([ex - px(5), eye_y - px(7), ex + px(5), eye_y - px(1)], 200, 340, fill=(45, 28, 16, 255), width=max(1, int(px(1.4))))
    d.line([cx, eye_y + px(2), cx - px(1.5), eye_y + px(8)], fill=(0, 0, 0, 60), width=max(1, int(px(1))))
    if brow_angry:
        d.line([cx - px(6), eye_y + px(15), cx + px(6), eye_y + px(13)], fill=(60, 30, 20, 220), width=max(1, int(px(1.6))))
    else:
        d.arc([cx - px(7), eye_y + px(5), cx + px(7), eye_y + px(15)], 20, 160, fill=(60, 30, 20, 220), width=max(1, int(px(1.6))))

    if accessory == "shades":
        d.rounded_rectangle([cx - px(16), eye_y - px(6), cx + px(16), eye_y + px(4)], radius=px(4), fill=(20, 18, 16, 255))
        d.line([cx - px(16), eye_y - px(1), cx - px(22), eye_y - px(3)], fill=(20, 18, 16, 255), width=max(1, int(px(1.6))))
        d.line([cx + px(16), eye_y - px(1), cx + px(22), eye_y - px(3)], fill=(20, 18, 16, 255), width=max(1, int(px(1.6))))

    return img.resize((FINAL_W, FINAL_H), Image.LANCZOS)


def main():
    OUT.mkdir(parents=True, exist_ok=True)

    skin_ngozi = (169, 113, 74, 255)
    orange = (217, 115, 36, 255)
    orange_dark = (148, 68, 20, 255)
    wrap_dark = (120, 60, 18, 255)

    draw_person(skin_ngozi, orange, orange_dark, headwrap=orange_dark, headwrap_dark=wrap_dark).save(OUT / "ngozi.png")
    draw_person(skin_ngozi, orange, orange_dark, headwrap=orange_dark, headwrap_dark=wrap_dark, tray=True).save(
        OUT / "ngozi-fry.png"
    )
    draw_person(
        skin_ngozi, orange, orange_dark, headwrap=orange_dark, headwrap_dark=wrap_dark, brow_angry=True
    ).save(OUT / "ngozi-defiant.png")

    # Mid-stride walk frames for the 3 player-controlled sprites (NPCs never
    # move, so they don't need one) — RpgMap swaps to these while walking.
    draw_person(skin_ngozi, orange, orange_dark, headwrap=orange_dark, headwrap_dark=wrap_dark, walking=True).save(
        OUT / "ngozi-walk.png"
    )
    draw_person(
        skin_ngozi, orange, orange_dark, headwrap=orange_dark, headwrap_dark=wrap_dark, tray=True, walking=True
    ).save(OUT / "ngozi-fry-walk.png")
    draw_person(
        skin_ngozi, orange, orange_dark, headwrap=orange_dark, headwrap_dark=wrap_dark, brow_angry=True, walking=True
    ).save(OUT / "ngozi-defiant-walk.png")

    skin_jagaban = (140, 90, 55, 255)
    mustard = (168, 122, 40, 255)
    mustard_dark = (108, 76, 20, 255)
    draw_person(skin_jagaban, mustard, mustard_dark, hair=(25, 18, 14, 255), accessory="shades").save(OUT / "jagaban.png")

    skin_trader = (150, 100, 65, 255)
    brown = (110, 72, 38, 255)
    brown_dark = (72, 46, 22, 255)
    draw_person(skin_trader, brown, brown_dark, hair=(35, 24, 16, 255)).save(OUT / "trader.png")

    # Ambient background market-goers — purely decorative figures that
    # wander the map (RpgMap's AMBIENT_NPCS), distinct in color from both
    # the player and the named story NPCs (jagaban/trader) so they don't
    # get mistaken for someone with a line of dialogue.
    skin_passerby1 = (176, 120, 80, 255)
    teal = (62, 110, 100, 255)
    teal_dark = (38, 72, 65, 255)
    draw_person(skin_passerby1, teal, teal_dark, headwrap=teal_dark, headwrap_dark=(50, 90, 82, 255)).save(
        OUT / "passerby-1.png"
    )

    skin_passerby2 = (120, 78, 50, 255)
    slate = (90, 95, 110, 255)
    slate_dark = (58, 62, 75, 255)
    draw_person(skin_passerby2, slate, slate_dark, hair=(20, 16, 14, 255)).save(OUT / "passerby-2.png")

    print(f"saved 10 sprites to {OUT}")


if __name__ == "__main__":
    main()
