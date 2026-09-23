import { GoibiboScraper } from "../../goibiboScraper.js";

const scraper = new GoibiboScraper();

export class Mode2GoibiboAdapter {
  constructor() {
    this.name = scraper.name;
    this.platformType = scraper.platformType;
  }

  async scrape(query) {
    return await scraper.scrape(query);
  }
}
