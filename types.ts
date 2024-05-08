export interface Politician {
    id: string;
    slug: string;
    age: number;
    firstName: string;
    lastName: string;
    firstNickname: string;
    nameSuffix: string;
    politicalAffiliationCategory: string;
    computedStanceScore: number;
    manuallyOverriddenStanceScore: number | null;
    profilePictureUrl: string;
    profilePictureUrlDimensions: {
        width: number;
        height: number;
    };
    promotedPositioning: any;
    primaryRole: {
        dateEnd: string;
        dateStart: string;
        id: string;
        primaryCity: string;
        primaryCountryCode: string;
        primaryDistrict: string;
        primaryState: string;
        roleCategory: string;
        status: string;
        title: string;
    };
}
