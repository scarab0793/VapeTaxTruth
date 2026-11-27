# VapeTaxTruth

**The Real Cost of the UK Vape Tax** — an independent, evidence-led public-interest site about UK Vaping Products Duty.

## Features
- Fully responsive static site hosted on GitHub Pages.
- Interactive DIY mixing and retail e-liquid cost calculators.
- Adjustable tax pass-through and illustrative VAT-on-duty calculation.
- Documented law, official government statements and carefully labelled open questions.
- Source links and transparent methodology.

## Deployment
GitHub repository → **Settings → Pages → Build and deployment** → **Deploy from a branch**, branch **main**, folder **/(root)**, then Save. Website: https://scarab0793.github.io/VapeTaxTruth/

## Calculator methodology
UK Vaping Products Duty is **£2.20 per 10ml** from 1 October 2026 (Finance Act 2026, s.115). By default, the calculator models duty of **£0.22/ml** passed on in full plus illustrative 20% VAT on that incremental duty, holding other prices constant. Real prices and treatment differ. The DIY inputs represent the separate volumes of PG/VG base, nicotine shots and flavouring purchased; these must not also be double-counted when later mixed. Not every general-purpose industrial ingredient is automatically a vaping product: statutory scope depends on the legal definition and intended use. The calculator is a *scenario*, not a forecast or professional tax advice.

## Primary sources
- [Finance Act 2026, Part 4](https://www.legislation.gov.uk/ukpga/2026/11/part/4)
- [HMRC payment guidance](https://www.gov.uk/guidance/how-to-pay-vaping-products-duty)
- [HMRC internal manual](https://www.gov.uk/hmrc-internal-manuals/vaping-products-duty-and-vaping-duty-stamps-guidance/vpds013000)
- [HMRC 1 October 2026 press release](https://www.gov.uk/government/news/new-vaping-products-duty-comes-into-effect)

## Report form
The form in `index.html` posts to a Google Apps Script web app that appends rows to a private Google Sheet. The page sends the report with `fetch` and only shows the thank-you message when the server replies `OK`. The hardened script lives in `apps-script/Code.gs`. To update it, paste it into the script editor, run `setup()` once, then use Deploy > Manage deployments > edit > New version. Execute as "Me", access "Anyone" (not "Anyone with a Google account", which returns 401).

## Data and automation
- `data/records.json` holds the HMRC meeting register (17 entries, each checked against HMRC's published disclosures on 27 Nov 2026) and the closure register.
- `scripts/refresh.py` pulls vaping-duty items from the GOV.UK Search API into `data/news.json`, keeping only titles that mention vaping and preserving old data if a request fails.
- `scripts/reddit.py` tries the Reddit RSS search and keeps previous data on failure. From GitHub's runners the feed may be refused, in which case the site says no community posts have been imported.
- `.github/workflows/refresh.yml` runs daily at 06:17 UTC and can be started by hand from the Actions tab.

Editorial policy: Distinguish verified facts, attributed commentary, forecasts and speculation. Do not assert lobbying caused legislation without evidence. No fabricated closure counts. Updated 27 November 2026.
