# GitHub Pages site

The download page uses the project's Manrope typography, green accent and fresh screenshots from the packaged application. It contains product/workspace labels, platform downloads, checksums, release notes and installation facts. No slogans or generated presentation copy were added.

The build accepts published stable GitHub release metadata and requires all four native installers plus SHA256SUMS. Missing, duplicate or foreign download URLs, draft/prerelease metadata and mismatched tags fail before output is written. Downloads are static links, so visitors do not depend on a browser API request. Fonts and images are local to the Pages artifact.

The release-driven build and main-branch refresh pattern are informed by the MIT-licensed Muzo and Showbiz sites. No source or marketing copy was reused. References: [Muzo](https://github.com/alexanderwanyoike/muzo/blob/main/.github/workflows/pages.yml), [Showbiz](https://github.com/alexanderwanyoike/showbiz/blob/main/.github/workflows/pages.yml), and [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

The meaningful regression failed because the baseline produced no installer links. The initial filesystem URL fixture was corrected before implementation. The completed build test verifies all release guards, links and actual local image files. The bundled CLI also built the preview successfully. The preview uses fixture metadata; production reads GitHub's latest published release and skips deployment before the first release exists.

A separate private-display browser run verified desktop and 390-pixel mobile layouts in light and dark modes, loaded screenshots/fonts, download-section navigation, installation notes, keyboard skip navigation and absence of horizontal overflow. All four screenshots were inspected. The in-app browser connection was unavailable, so verification used an isolated Electron Chromium window on a private virtual display. No user desktop or audio session was used.
