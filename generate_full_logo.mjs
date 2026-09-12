import fs from 'fs';

const svgFullLogo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 320" fill="none">
  <defs>
    <style>
      .brand-charcoal { fill: #2D3136; }
      .brand-orange { fill: #FF5800; }
      @media (prefers-color-scheme: dark) {
        .brand-charcoal { fill: #F4F4F5; }
      }
    </style>
    <linearGradient id="salead-bg-grad-full" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF8A00" />
      <stop offset="45%" stop-color="#FF4500" />
      <stop offset="100%" stop-color="#D92200" />
    </linearGradient>
    <clipPath id="e-charcoal-clip-full">
      <polygon points="700,340 1150,340 1150,158 700,250" />
    </clipPath>
    <clipPath id="e-orange-clip-full">
      <polygon points="700,-20 1150,-20 1150,146 700,238" />
    </clipPath>
  </defs>

  <!-- 1. ICON (Squircle + Network Nodes) -->
  <g transform="translate(10, 10)">
    <!-- Squircle Background -->
    <rect width="300" height="300" rx="72" fill="url(#salead-bg-grad-full)" />

    <!-- Network Nodes Graphic (White) -->
    <g fill="#FFFFFF" stroke="#FFFFFF" stroke-linecap="round" stroke-linejoin="round" transform="scale(0.586) translate(0, 0)">
      <path d="M 380 120 L 270 270" stroke-width="32" />
      <path d="M 270 145 L 195 220" stroke-width="28" />
      <path d="M 270 145 L 270 270" stroke-width="26" />
      <path d="M 270 145 L 380 260" stroke-width="28" />
      <path d="M 195 220 L 130 325" stroke-width="34" />
      <path d="M 195 220 L 270 270" stroke-width="30" />
      <path d="M 130 325 L 270 270" stroke-width="32" />
      <path d="M 270 270 L 380 260" stroke-width="32" />
      <path d="M 270 270 L 260 390" stroke-width="34" />
      <path d="M 380 260 L 260 390" stroke-width="38" />

      <circle cx="380" cy="120" r="38" />
      <circle cx="270" cy="145" r="24" />
      <circle cx="195" cy="220" r="38" />
      <circle cx="270" cy="270" r="28" />
      <circle cx="380" cy="260" r="48" />
      <circle cx="130" cy="325" r="48" />
      <circle cx="260" cy="390" r="48" />
    </g>
  </g>

  <!-- 2. WORDMARK LOGO (SALEAD) -->
  <g transform="translate(370, 10)">
    <!-- Orange Diagonal Slash Accent Line -->
    <polygon points="460,265 490,265 640,55 610,55" class="brand-orange" />

    <!-- S (Charcoal) -->
    <path class="brand-charcoal" d="
      M 130 70
      C 75 70 30 98 30 140
      C 30 188 82 195 115 204
      C 138 210 142 222 128 228
      C 110 234 62 225 38 208
      L 15 248
      C 48 274 105 282 142 278
      C 198 272 218 235 212 192
      C 208 145 160 138 132 128
      C 108 120 102 108 115 100
      C 132 92 172 104 190 118
      L 210 78
      C 182 65 158 70 130 70 Z
    " />

    <!-- A (Charcoal) -->
    <path class="brand-charcoal" d="
      M 220 280
      L 280 70
      L 345 70
      L 405 280
      L 350 280
      L 335 225
      L 290 225
      L 275 280 Z
      M 298 180
      L 327 180
      L 312 120 Z
    " />

    <!-- L (Charcoal) -->
    <path class="brand-charcoal" d="
      M 420 70
      L 475 70
      L 475 230
      L 550 230
      L 550 280
      L 420 280 Z
    " />

    <!-- E Base Shape -->
    <g id="letter-E-full">
      <path d="
        M 565 70
        L 680 70
        L 680 118
        L 620 118
        L 620 148
        L 670 148
        L 670 192
        L 620 192
        L 620 232
        L 685 232
        L 685 280
        M 565 280
        L 565 70 Z
      " />
    </g>

    <!-- E - Charcoal Bottom -->
    <path class="brand-charcoal" clip-path="url(#e-charcoal-clip-full)" d="
      M 565 70 L 680 70 L 680 118 L 620 118 L 620 148 L 670 148 L 670 192 L 620 192 L 620 232 L 685 232 L 685 280 L 565 280 Z
    " />

    <!-- E - Orange Top -->
    <path class="brand-orange" clip-path="url(#e-orange-clip-full)" d="
      M 565 70 L 680 70 L 680 118 L 620 118 L 620 148 L 670 148 L 670 192 L 620 192 L 620 232 L 685 232 L 685 280 L 565 280 Z
    " />

    <!-- A (Orange) -->
    <path class="brand-orange" d="
      M 700 280
      L 760 70
      L 825 70
      L 885 280
      L 830 280
      L 815 225
      L 770 225
      L 755 280 Z
      M 778 180
      L 807 180
      L 792 120 Z
    " />

    <!-- D (Orange) -->
    <path class="brand-orange" d="
      M 900 70
      L 990 70
      C 1060 70 1100 105 1100 175
      C 1100 245 1060 280 990 280
      L 900 280 Z
      M 955 118
      L 955 232
      L 985 232
      C 1015 232 1040 215 1040 175
      C 1040 135 1015 118 985 118 Z
    " />
  </g>
</svg>`;

fs.writeFileSync('public/salead_full_logo.svg', svgFullLogo);
console.log('Successfully generated public/salead_full_logo.svg');
