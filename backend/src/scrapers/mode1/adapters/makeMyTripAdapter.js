import { MakeMyTripScraper } from "../../makeMyTripScraper.js";

const scraper = new MakeMyTripScraper();

export class Mode1MakeMyTripAdapter {
  constructor() {
    this.name = scraper.name;
    this.platformType = scraper.platformType;
  }

  async scrape(query) {
    return await scraper.scrape(query);
  }
}
