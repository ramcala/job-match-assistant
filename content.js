function clean(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function firstText(selectors) {
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    const text = clean(el?.innerText || el?.textContent);
    if (text) return text;
  }
  return "";
}

function extractJob() {
  const linkedin = location.hostname.includes("linkedin.com");
  const title = firstText(linkedin ? [
    ".job-details-jobs-unified-top-card__job-title h1",
    ".job-details-jobs-unified-top-card__job-title",
    "h1"
  ] : ["h1", "[data-testid*='job-title']", "[class*='job-title']"]);

  const company = firstText(linkedin ? [
    ".job-details-jobs-unified-top-card__company-name",
    ".job-details-jobs-unified-top-card__primary-description-container a"
  ] : ["[data-testid*='company']", "[class*='company-name']", "[class*='company']"]);

  const locationText = firstText(linkedin ? [
    ".job-details-jobs-unified-top-card__tertiary-description-container",
    ".job-details-jobs-unified-top-card__primary-description-container"
  ] : ["[data-testid*='location']", "[class*='location']"]);

  let description = firstText(linkedin ? [
    "#job-details",
    ".jobs-description-content__text",
    ".jobs-description"
  ] : [
    "[data-testid*='job-description']",
    "[class*='job-description']",
    "article",
    "main"
  ]);

  if (!description) description = clean(document.body.innerText).slice(0, 25000);
  return { title, company, location: locationText, description: description.slice(0, 30000), url: location.href };
}

extractJob();
