import React from 'react';
import headUrl from '../../assets/boy-head.webp';
import { BOY_REACH, BOY_SHOULDER, BOY_VIEW } from './boyGeometry';

// Skin is sampled from the photo so the arms and legs match the face. The flashlight is on the
// right of the picture, so shading sits on the left of each shape.
const SKIN = '#be7e59';
const SKIN_SHADE = '#9c6145';
const SHIRT = '#5bbf3c';
const SHIRT_LIGHT = '#7fd862';
const SHIRT_SHADE = '#45a02c';
const SHIRT_DARK = '#347a20';
const DENIM = '#3f6fb5';
const DENIM_LIGHT = '#5a87c8';
const DENIM_SHADE = '#2d5590';
const STITCH = '#e8b54d';
const SHOE = '#d6383e';
const SHOE_SHADE = '#a8262d';
const SOLE = '#f5f0e7';
const SOCK = '#f2eee6';

const LENS_X = BOY_SHOULDER.x + BOY_REACH; // 284
const ARM_Y = BOY_SHOULDER.y; // 118
const SHOULDER_ORIGIN = `${BOY_SHOULDER.x}px ${ARM_Y}px`;

// Short, chubby leg from under the shorts down to a chunky red sneaker pointing right.
function Leg({ cx, dy = 0, className, origin }) {
  const hx = cx - 17; // heel
  const by = 332 + dy; // bottom of the sole
  return (
    <g className={className} style={{ transformOrigin: origin }}>
      <path
        d={`M${cx - 13} 242 L${cx + 13} 242 C${cx + 14} 258 ${cx + 13} 270 ${cx + 12} 282 C${cx + 11} 290 ${cx + 10} 296 ${cx + 9} 302 L${cx - 9} 302 C${cx - 10} 296 ${cx - 11} 290 ${cx - 12} 282 C${cx - 13} 270 ${cx - 14} 258 ${cx - 13} 242 Z`}
        fill={SKIN}
      />
      <path
        d={`M${cx - 13} 242 L${cx - 6} 242 C${cx - 6} 258 ${cx - 6} 270 ${cx - 6} 282 C${cx - 5} 290 ${cx - 4} 296 ${cx - 3} 302 L${cx - 9} 302 C${cx - 10} 296 ${cx - 11} 290 ${cx - 12} 282 C${cx - 13} 270 ${cx - 14} 258 ${cx - 13} 242 Z`}
        fill={SKIN_SHADE}
        opacity="0.45"
      />
      <path d={`M${cx - 6} 262 Q${cx} 266 ${cx + 6} 262`} stroke={SKIN_SHADE} strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.5" />

      <rect x={cx - 10} y="289" width="20" height="16" rx="3" fill={SOCK} />
      <path d={`M${cx - 9.5} 294 L${cx + 9.5} 294`} stroke="#d9d2c6" strokeWidth="1.2" />

      {/* chunky sneaker */}
      <path
        d={`M${hx + 2} ${by - 30} L${hx + 20} ${by - 32} C${hx + 28} ${by - 30} ${hx + 33} ${by - 24} ${hx + 38} ${by - 19} C${hx + 44} ${by - 15} ${hx + 48} ${by - 12} ${hx + 48} ${by - 7} L${hx + 48} ${by - 4} Q${hx + 48} ${by + 1} ${hx + 42} ${by + 1} L${hx + 4} ${by + 1} Q${hx - 1} ${by + 1} ${hx - 1} ${by - 5} L${hx - 1} ${by - 24} Q${hx - 1} ${by - 30} ${hx + 2} ${by - 30} Z`}
        fill={SHOE}
      />
      <path d={`M${hx - 1} ${by - 24} Q${hx - 1} ${by - 30} ${hx + 2} ${by - 30} L${hx + 8} ${by - 30} L${hx + 8} ${by - 9} L${hx - 1} ${by - 9} Z`} fill={SHOE_SHADE} opacity="0.6" />
      <ellipse cx={hx + 11} cy={by - 30} rx="9.5" ry="2.3" fill={SHOE_SHADE} />
      <path d={`M${hx + 38} ${by - 19} C${hx + 44} ${by - 15} ${hx + 48} ${by - 12} ${hx + 48} ${by - 9} L${hx + 35} ${by - 9} C${hx + 35} ${by - 13} ${hx + 36} ${by - 16} ${hx + 38} ${by - 19} Z`} fill={SOLE} opacity="0.92" />
      <path d={`M${hx + 6} ${by - 13} L${hx + 29} ${by - 19}`} stroke={SOLE} strokeWidth="3" strokeLinecap="round" />
      <path d={`M${hx + 21} ${by - 31} L${hx + 26} ${by - 28} M${hx + 26} ${by - 27} L${hx + 31} ${by - 24} M${hx + 31} ${by - 23} L${hx + 36} ${by - 20}`} stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
      <path d={`M${hx - 1} ${by - 9} L${hx + 48} ${by - 9} L${hx + 48} ${by - 4} Q${hx + 48} ${by + 1.5} ${hx + 42} ${by + 1.5} L${hx + 4} ${by + 1.5} Q${hx - 1} ${by + 1.5} ${hx - 1} ${by - 4} Z`} fill={SOLE} />
      <path d={`M${hx} ${by - 3.5} L${hx + 47} ${by - 3.5}`} stroke="#d8d0c2" strokeWidth="1" />
    </g>
  );
}

/**
 * Little boy in the video's outfit (green tee, denim shorts, red sneakers) wearing the photo
 * head, with a child's proportions (about four heads tall). `armDeg` turns the flashlight arm
 * around the shoulder so the beam can aim at the card.
 */
export function FlashlightBoy({ armDeg = 0, className }) {
  return (
    <svg viewBox={`0 0 ${BOY_VIEW.w} ${BOY_VIEW.h}`} className={className} overflow="visible" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="fb-metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5f6773" />
          <stop offset="0.3" stopColor="#e6ebf0" />
          <stop offset="0.6" stopColor="#a8b0bb" />
          <stop offset="1" stopColor="#4c535e" />
        </linearGradient>
        <radialGradient id="fb-glow">
          <stop offset="0" stopColor="#fffef6" stopOpacity="1" />
          <stop offset="0.3" stopColor="#fff4d4" stopOpacity="0.8" />
          <stop offset="1" stopColor="#ffe9b8" stopOpacity="0" />
        </radialGradient>
      </defs>

      <Leg cx={56} className="fb-anim fb-leg-l" origin="56px 232px" />
      <Leg cx={100} dy={2} className="fb-anim fb-leg-r" origin="100px 232px" />

      <g className="fb-anim fb-bob">
        {/* denim shorts */}
        <path d="M36 190 L120 190 C122 210 124 230 126 248 Q104 254 82 250 L78 224 L74 250 Q52 254 30 248 C32 230 34 210 36 190 Z" fill={DENIM} />
        <path d="M36 190 L46 190 C44 210 42 230 41 252 Q35 250 30 248 C32 230 34 210 36 190 Z" fill={DENIM_SHADE} opacity="0.55" />
        <path d="M78 206 L78 224 L74 250 Q70 251 66 251 C70 236 74 220 78 206 Z" fill={DENIM_SHADE} opacity="0.45" />
        <path d="M30.5 241 Q52 247 74.5 243 L74 250 Q52 254 30 248 Z M81.5 243 Q104 247 125.5 241 L126 248 Q104 254 82 250 Z" fill={DENIM_LIGHT} />
        <path d="M32 237 Q52 243 74.5 239 M81.5 239 Q104 243 124.5 237" stroke={STITCH} strokeWidth="1" strokeDasharray="3 2.5" fill="none" />
        <path d="M78 202 L78 222" stroke={DENIM_SHADE} strokeWidth="2" strokeLinecap="round" />
        <path d="M78 205 Q86 208 85 220" stroke={STITCH} strokeWidth="1" strokeDasharray="3 2.5" fill="none" />
        <path d="M39 202 Q48 205 51 216 M117 202 Q108 205 105 216" stroke={DENIM_SHADE} strokeWidth="2" strokeLinecap="round" fill="none" />

        {/* far arm, hanging a little away from the body */}
        <g className="fb-anim fb-arm-back" style={{ transformOrigin: '28px 112px' }}>
          <path d="M13 126 L34 126 C35 146 35 164 34 180 C33 194 32 204 31 214 L16 214 C15 204 14 194 13 180 C12 164 11 146 13 126 Z" fill={SKIN} />
          <path d="M13 126 L19 126 C19 146 19 164 19 180 C19 194 19 204 20 214 L16 214 C15 204 14 194 13 180 C12 164 11 146 13 126 Z" fill={SKIN_SHADE} opacity="0.5" />
          <path d="M16 176 Q23 180 31 176" stroke={SKIN_SHADE} strokeWidth="1.3" strokeLinecap="round" fill="none" opacity="0.5" />
          <path d="M15 210 C12 218 13 230 18 236 C22 240 29 239 32 233 C34 226 34 218 32 210 Z" fill={SKIN} />
          <path d="M19 232 L20 238 M24 234 L24.5 239.5 M28.5 232.5 L29 237.5" stroke={SKIN_SHADE} strokeWidth="1" strokeLinecap="round" opacity="0.7" />
          {/* sleeve */}
          <path d="M30 106 C20 110 11 120 9 133 L8 148 Q25 155 44 148 L44 122 C42 114 37 108 30 106 Z" fill={SHIRT} />
          <path d="M30 106 C20 110 11 120 9 133 L8 148 Q13 150 18 151 L19 130 C20 120 24 112 30 106 Z" fill={SHIRT_SHADE} opacity="0.85" />
          <path d="M8.5 144 Q25 151 44 144" stroke={SHIRT_DARK} strokeWidth="2.4" fill="none" opacity="0.8" />
        </g>

        {/* photo head; the tee's collar covers the bottom of the neck */}
        <image href={headUrl} x="47" y="0" width="68" height="106" />

        {/* roomy kid tee */}
        <path d="M58 96 C50 98 40 101 33 106 C29 111 30 120 32 128 C33 150 32 172 30 196 Q78 206 126 196 C124 172 123 150 124 128 C126 120 127 111 123 106 C116 101 106 98 99 96 Q78 110 58 96 Z" fill={SHIRT} />
        <path d="M33 106 C29 111 30 120 32 128 C33 150 32 172 30 196 Q36 198 42 199 C42 175 42 150 41 128 C40 118 37 111 33 106 Z" fill={SHIRT_SHADE} opacity="0.85" />
        <path d="M114 116 C119 134 119 170 117 194 L125 196 C124 172 123 150 124 128 C125 122 121 117 114 116 Z" fill={SHIRT_LIGHT} opacity="0.5" />
        <path d="M46 186 Q58 192 70 188 M86 190 Q100 194 112 186" stroke={SHIRT_SHADE} strokeWidth="1.7" strokeLinecap="round" fill="none" opacity="0.6" />
        <path d="M30.5 193 Q78 203 125.5 193" stroke={SHIRT_DARK} strokeWidth="2" fill="none" opacity="0.55" />
        <path d="M58 96 Q78 110 99 96" stroke={SHIRT_DARK} strokeWidth="4.5" strokeLinecap="round" fill="none" />
        {/* little Ash Do badge */}
        <circle cx="100" cy="142" r="6" fill="#c2f23d" />
        <path d="M97 142.2 L99.2 144.4 L103.1 139.8" stroke="#131b02" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />

        {/* flashlight arm, drawn pointing right. It swings while he walks (outer group), starts
            hanging down and lifts to aim at the card once he stops (inner group, --arm-deg). */}
        <g className="fb-anim fb-arm-swing" style={{ transformOrigin: SHOULDER_ORIGIN }}>
        <g className="fb-anim fb-arm-raise" style={{ '--arm-deg': `${armDeg.toFixed(2)}deg`, transformOrigin: SHOULDER_ORIGIN }}>
          <path d="M140 107 C156 106 176 106 192 108 C198 111 199 125 192 129 C176 131 156 131 140 130 Z" fill={SKIN} />
          <path d="M188 108.5 C204 109 220 109.5 236 110 L236 126 C220 126.5 204 127 188 128 Z" fill={SKIN} />
          <path d="M146 125 C165 126 180 126 192 125.5 C206 125 222 124.5 236 124 L236 126 C220 126.5 204 127 188 128 L176 130 C160 130.8 150 130.5 146 130 Z" fill={SKIN_SHADE} opacity="0.45" />
          <path d="M190 112 Q194 118 190 124" stroke={SKIN_SHADE} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.5" />
          {/* sleeve */}
          <path d="M106 104 C120 100 138 101 150 105 C155 112 155 128 150 135 C136 138 120 138 108 134 Z" fill={SHIRT} />
          <path d="M108 127 C122 131 138 131 153 128 C152 131 151 133 150 135 C136 138 120 138 108 134 Z" fill={SHIRT_SHADE} opacity="0.85" />
          <path d="M150 105 C155 112 155 128 150 135" stroke={SHIRT_DARK} strokeWidth="2.4" fill="none" opacity="0.8" />

          {/* flashlight */}
          <rect x="234" y="110" width="34" height="16" rx="3" fill="url(#fb-metal)" />
          <rect x="256" y="110" width="2" height="16" fill="#3f454e" opacity="0.45" />
          <rect x="261" y="110" width="2" height="16" fill="#3f454e" opacity="0.45" />
          <rect x="257.5" y="107.6" width="6" height="3" rx="1" fill="#2f343b" />
          <path d={`M266 110 L278 101.5 L${LENS_X} 101.5 L${LENS_X} 134.5 L278 134.5 L266 126 Z`} fill="url(#fb-metal)" />
          <rect x="278" y="101.5" width="2" height="33" fill="#3f454e" opacity="0.35" />
          <ellipse cx={LENS_X} cy={ARM_Y} rx="2.6" ry="15.5" fill="#c9d0d8" />
          <ellipse className="fb-anim fb-lens" cx={LENS_X} cy={ARM_Y} rx="2.6" ry="15.5" fill="#fffbea" />

          {/* fist around the handle */}
          <path d="M234 105 C244 102 253 104 256 110 L256 126 C254 132 244 134 234 131 C228 128 226 123 226 118 C226 113 228 108 234 105 Z" fill={SKIN} />
          <path d="M238 111 L254 111 M238 118 L255 118 M238 125 L254 125" stroke={SKIN_SHADE} strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
          <path d="M230 107 C237 100 248 100 255 105" stroke={SKIN} strokeWidth="6" strokeLinecap="round" fill="none" />

          <circle className="fb-anim fb-lens" cx={LENS_X + 3} cy={ARM_Y} r="26" fill="url(#fb-glow)" />
        </g>
        </g>
      </g>
    </svg>
  );
}
