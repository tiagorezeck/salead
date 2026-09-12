const fs = require('fs');

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 300" width="1200" height="300" fill="none">
  <defs>
    <style>
      .charcoal { fill: #2D3136; }
      .orange { fill: #FF5800; }
      @media (prefers-color-scheme: dark) {
        .charcoal { fill: #F4F4F5; }
      }
    </style>
    <!-- Mask for E bottom (charcoal) -->
    <clipPath id="e-charcoal-clip">
      <polygon points="400,320 750,320 750,145 400,240" />
    </clipPath>
    <!-- Mask for E top (orange) -->
    <clipPath id="e-orange-clip">
      <polygon points="400,-20 750,-20 750,133 400,228" />
    </clipPath>
  </defs>

  <!-- Orange Diagonal Slash Accent Line -->
  <polygon points="500,255 530,255 680,45 650,45" class="orange" />

  <!-- S (Charcoal) -->
  <path class="charcoal" d="
    M 150 60
    C 90 60 40 90 40 135
    C 40 185 95 192 130 202
    C 155 208 160 220 145 228
    C 125 235 70 225 45 205
    L 20 245
    C 55 272 115 280 155 275
    C 215 268 235 230 230 188
    C 225 138 175 130 145 120
    C 120 112 115 98 130 90
    C 150 82 190 95 210 110
    L 230 70
    C 200 55 175 60 150 60 Z
  " />

  <!-- A (Charcoal) -->
  <path class="charcoal" d="
    M 240 270
    L 300 60
    L 365 60
    L 425 270
    L 370 270
    L 355 215
    L 310 215
    L 295 270 Z
    M 318 170
    L 347 170
    L 332 110 Z
  " />

  <!-- L (Charcoal) -->
  <path class="charcoal" d="
    M 440 60
    L 495 60
    L 495 220
    L 570 220
    L 570 270
    L 440 270 Z
  " />

  <!-- E Base Shape definition reused for clipping -->
  <g id="letter-E-shape">
    <!-- E stem + 3 horizontal bars -->
    <path d="
      M 585 60
      L 700 60
      L 700 108
      L 640 108
      L 640 138
      L 690 138
      L 690 182
      L 640 182
      L 640 222
      L 705 222
      L 705 270
      L 585 270 Z
    " />
  </g>

  <!-- E - Charcoal Bottom Part -->
  <use href="#letter-E-shape" class="charcoal" clip-path="url(#e-charcoal-clip)" />

  <!-- E - Orange Top Part -->
  <use href="#letter-E-shape" class="orange" clip-path="url(#e-orange-clip)" />

  <!-- A (Orange) -->
  <path class="orange" d="
    M 720 270
    L 780 60
    L 845 60
    L 905 270
    L 850 270
    L 835 215
    L 790 215
    L 775 270 Z
    M 798 170
    L 827 170
    L 812 110 Z
  " />

  <!-- D (Orange) -->
  <path class="orange" d="
    M 920 60
    L 1010 60
    C 1080 60 1120 95 1120 165
    C 1120 235 1080 270 1010 270
    L 920 270 Z
    M 975 108
    L 975 222
    L 1005 222
    C 1035 222 1060 205 1060 165
    C 1060 125 1035 108 1005 108 Z
  " />
</svg>`;

fs.writeFileSync('public/salead_logo.svg', svgContent);
console.log('Successfully generated public/salead_logo.svg');
