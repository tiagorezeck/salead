import fs from 'fs';

const svgLogo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1020 220" width="1020" height="220" fill="none">
  <defs>
    <style>
      .brand-charcoal { fill: #2D3136; }
      .brand-orange { fill: #FF5800; }
      @media (prefers-color-scheme: dark) {
        .brand-charcoal { fill: #F4F4F5; }
      }
    </style>
    <!-- Mask for E bottom (charcoal) -->
    <clipPath id="e-bot-clean">
      <polygon points="380,240 700,240 700,105 380,180" />
    </clipPath>
    <!-- Mask for E top (orange) -->
    <clipPath id="e-top-clean">
      <polygon points="380,-20 700,-20 700,95 380,170" />
    </clipPath>
  </defs>

  <!-- Orange Diagonal Slash Accent Line -->
  <polygon points="465,195 495,195 625,18 595,18" class="brand-orange" />

  <!-- S (Charcoal) -->
  <path class="brand-charcoal" d="
    M 115 30
    C 65 30 25 55 25 95
    C 25 138 72 145 102 153
    C 125 158 128 170 114 175
    C 98 180 55 172 32 158
    L 12 195
    C 42 218 92 225 125 222
    C 175 218 192 185 188 148 C 184 105 142 98 116 90
    C 95 83 90 72 102 65
    C 118 58 152 68 168 80
    L 185 45
    C 160 33 138 30 115 30 Z
  " />

  <!-- A (Charcoal) -->
  <path class="brand-charcoal" d="
    M 195 215
    L 250 30
    L 308 30
    L 362 215
    L 312 215
    L 298 168
    L 258 168
    L 245 215 Z
    M 265 128
    L 291 128
    L 278 78 Z
  " />

  <!-- L (Charcoal) -->
  <path class="brand-charcoal" d="
    M 375 30
    L 425 30
    L 425 172
    L 492 172
    L 492 215
    L 375 215 Z
  " />

  <!-- E - Charcoal Bottom Part -->
  <path class="brand-charcoal" clip-path="url(#e-bot-clean)" d="
    M 505 30 L 610 30 L 610 72 L 555 72 L 555 98 L 600 98 L 600 138 L 555 138 L 555 172 L 615 172 L 615 215 L 505 215 Z
  " />

  <!-- E - Orange Top Part -->
  <path class="brand-orange" clip-path="url(#e-top-clean)" d="
    M 505 30 L 610 30 L 610 72 L 555 72 L 555 98 L 600 98 L 600 138 L 555 138 L 555 172 L 615 172 L 615 215 L 505 215 Z
  " />

  <!-- A (Orange) -->
  <path class="brand-orange" d="
    M 625 215
    L 680 30
    L 738 30
    L 792 215
    L 742 215
    L 728 168
    L 688 168
    L 675 215 Z
    M 695 128
    L 721 128
    L 708 78 Z
  " />

  <!-- D (Orange) -->
  <path class="brand-orange" d="
    M 805 30
    L 885 30
    C 948 30 985 60 985 122
    C 985 185 948 215 885 215
    L 805 215 Z
    M 855 72
    L 855 172
    L 882 172
    C 908 172 930 158 930 122
    C 930 86 908 72 882 72 Z
  " />
</svg>`;

fs.writeFileSync('public/salead_logo.svg', svgLogo);
fs.writeFileSync('public/logo_ct.svg', svgLogo);
console.log('Successfully generated public/salead_logo.svg');
