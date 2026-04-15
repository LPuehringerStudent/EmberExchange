import {Listing, ListingRow} from "../shared/model";

export class MarketPlace {
    listings: ListingRow[] = new Array<ListingRow>();

    public createListing(sellerId:number, stoveId:number, price:number ): void {
        this.listings.push({
            listedAt: new Date(Date.now()),
            sellerId: sellerId,
            status: "active",
            listingId: this.listings.length > 0 ? (this.listings[this.listings.length-1].listingId+1) : 0,
            stoveId: stoveId,
            price:price
        })
    }

}