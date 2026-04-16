import {Listing, ListingRow} from "../shared/model";

export class MarketPlace {
    listings: ListingRow[] = new Array<ListingRow>();

    constructor() {
        this.listings = this.getListingsFromDatabase();
    }

    public createListing(sellerId:number, stoveId:number, price:number ): void {
        this.listings.push({
            listedAt: new Date(Date.now()),
            sellerId: sellerId,
            status: "active",
            listingId: this.listings.length > 0 ? (this.listings[this.listings.length-1].listingId+1) : 0,
            stoveId: stoveId,
            price:price
        })
        //TODO: Add listing to database
    }

    private getListingsFromDatabase() : ListingRow[] {
        //TODO: Get From Database
        return [];
    }

    public executePurchase(buyerId: number, listingId: number): void {
        const listing = this.listings.find(value => value.listingId == listingId);
        if (!listing || listing.status != "active") {
            return;
        }
        listing.status = 'sold';
        //TODO: add Item to buyer database && remove Item from listing Database
        //TODO: Add to sales Statistics
    }

    public cancel(listingId:number, currentUserId: number): void {
        const listing = this.listings.find(value => value.listingId == listingId);
        if (!listing || currentUserId != listing.sellerId) {
            return;
        }
        listing.status = 'cancelled';
        //TODO: Update Database
    }



}