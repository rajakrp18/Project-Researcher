$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path "apps\contact-finder" | Out-Null
New-Item -ItemType Directory -Force -Path "apps\project-researcher" | Out-Null

$itemsToMove = @(
    "app",
    "lib",
    "public",
    "node_modules",
    ".next",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "next.config.ts",
    "next-env.d.ts",
    "eslint.config.mjs",
    ".env.local",
    ".gitignore",
    "AGENTS.md",
    "Data Scraping Process.docx",
    "Gen3_IEPF_Shareholder_Tracer_Handoff_Document.docx",
    "dataset.txt"
)

foreach ($item in $itemsToMove) {
    if (Test-Path $item) {
        Move-Item -Path $item -Destination "apps\contact-finder\" -Force
    }
}
