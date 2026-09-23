import { AirIndiaScraper } from "../../airIndiaScraper.js";

const scraper = new AirIndiaScraper();

export class Mode2AirIndiaAdapter {
  constructor() {
    this.name = scraper.name;
    this.platformType = scraper.platformType;
    this.airlineCode = scraper.airlineCode;
  }

  async scrape(query) {
    return await scraper.scrape(query);
  }
}
