import { load } from "cheerio";
import { plot, type Plot } from "nodeplotlib";
import type { Politician } from "./types";
import fs from "fs";

const PATH_SWCO_POLITICIANS_ALL = "data/politicians-swco_all.json";
const PATH_POLITICIANS_CURATED = "data/politicians-curated.json";
const FLAG_CURATE = false;
const FLAG_COUNT_BIAS = true;

async function main(): Promise<void> {
    const swcoPoliticians = JSON.parse(fs.readFileSync(PATH_SWCO_POLITICIANS_ALL, "utf-8"));

    if (FLAG_CURATE) {
        let curatedPoliticiansBuf: Politician[] = fs.existsSync(PATH_POLITICIANS_CURATED)
            ? await JSON.parse(fs.readFileSync(PATH_POLITICIANS_CURATED, "utf-8"))
            : [];

        await Promise.all(
            swcoPoliticians.map((politician: Politician) => curatePolitician(politician, curatedPoliticiansBuf))
        );
        fs.writeFileSync(PATH_POLITICIANS_CURATED, JSON.stringify(curatedPoliticiansBuf));
        console.log(`wrote ${PATH_POLITICIANS_CURATED} to disk`);
    }

    const curatedPoliticians = (await JSON.parse(fs.readFileSync(PATH_POLITICIANS_CURATED, "utf-8"))).filter(
        (p: Politician) => p.computedStanceScore !== null
    );

    if (FLAG_COUNT_BIAS) {
        const democractCount = curatedPoliticians.reduce((count: number, politician: Politician) => {
            if (politician.politicalAffiliationCategory === "DEMOCRAT") count++;

            return count;
        }, 0);
        const republicanCount = curatedPoliticians.length - democractCount;

        console.log(`${democractCount} DEMOCRATS | ${republicanCount} REPUBLICANS`);
    }

    const data: Plot[] = curatedPoliticians.map((politician: Politician) => ({
        x: [politician.age],
        y: [politician.computedStanceScore],
        mode: "markers",
        type: "scatter",
        marker: {
            color: politician.politicalAffiliationCategory === "REPUBLICAN" ? "red" : "blue",
        },
    }));

    const layout = {
        title: "Correlation between Computed Stance Score and Age (+ stance score means better approval of crypto)",
        xaxis: {
            title: "Age",
        },
        yaxis: {
            title: "Computed Stance Score",
        },
    };

    plot(data, layout);
}

main().catch((err) => console.error(err));

async function curatePolitician(politician: Politician, politiciansBuf: Politician[]): Promise<void> {
    if (politiciansBuf.some((p) => politician.id === p.id)) {
        console.log(`${politician.firstName} ${politician.lastName} already curated..`);
        return;
    }

    try {
        const age: number = await scrapeAge(politician);
        politician.age = age;
        politiciansBuf.push(politician);
        console.log(`${politician.firstName} ${politician.lastName} added to curated list.`);
    } catch (error) {
        console.error(`Failed to get age for ${politician.firstName} ${politician.lastName}`);
    }
}

/**
 *
 * @see https://developers.oxylabs.io/scraper-apis/serp-scraper-api/google/search
 */
async function scrapeAge(politician: Politician): Promise<number> {
    try {
        const { firstName, lastName } = politician;

        const payload = {
            source: "google_search",
            domain: "com",
            query: `${firstName} ${lastName} age`,
            start_page: 1,
            pages: 1,
            context: [{ key: "results_language", value: "pt" }],
        };

        const response = await fetch("https://realtime.oxylabs.io/v1/queries", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Basic " + btoa(`${process.env.OXYLABS_USER}:${process.env.OXYLABS_PASS}`),
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch age. Status: ${response.status}`);
        }

        const responseData = await response.json();
        const htmlContent = responseData?.results?.[0]?.content;
        const $ = load(htmlContent);
        const ageElement = $('[data-attrid="kc:/people/person:age"]');
        const ageDiv = ageElement.find("div > div");
        const age = ageDiv.text().trim();

        if (!age) {
            throw new Error("Age not found in response");
        }

        return parseInt(age);
    } catch (error) {
        console.error("Error fetching age:", error);
        throw new Error("Failed to fetch age");
    }
}
