import { wow } from "blizzard.js";
import chalk from "chalk";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import * as cheerio from "cheerio";
import fs from "fs/promises";
import open from "open";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const BASE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>WoW Auction House</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
    }

    table {
      border-collapse: collapse;
    }

    table, th, td {
      border: 1px solid black;
    }

    th, td {
      padding: 5px;
    }

    th {
      text-align: left;
    }
  </style>
</head>
<body>
  <table></table>
</body>`;

function formatPrice(price) {
  const formatted = Intl.NumberFormat("en-US").format(
    Math.round(price / 10000)
  );

  return `${formatted}g`;
}

function createHTML(results) {
  const $ = cheerio.load(BASE_HTML);

  const $table = $("table");

  $table.append("<tr><th>Realm</th><th>Lowest Price</th></tr>");

  for (const result of results) {
    const price =
      result.lowestPrice !== null ? formatPrice(result.lowestPrice) : "--";

    $table.append(`<tr><td>${result.name}</td><td>${price}</td></tr>`);
  }

  return $.html();
}

function findItemsById(auctions, id) {
  return auctions.filter((auction) => auction.item.id === id);
}

async function getAuctionHouse(client, realmId) {
  const response = await client.auctionHouse({ id: realmId });

  return response.data.auctions;
}

async function getRealms(client) {
  const response = await client.connectedRealmSearch({ status: "UP" });

  return response.data.results.map((result) => ({
    id: result.data.id,
    name: result.data.realms.reduce(
      (acc, realm) =>
        acc === "" ? `${realm.name.en_US}` : `${acc}, ${realm.name.en_US}`,
      ""
    ),
  }));
}

async function main() {
  const args = yargs(hideBin(process.argv)).argv;
  const ITEM_ID = args.id;
  const DEBUG = args.debug;

  if (ITEM_ID === undefined) {
    console.error(chalk.red("No item id provided"));
    process.exit(1);
  }

  const client = await wow.createInstance({
    key: process.env.CLIENT_ID,
    secret: process.env.CLIENT_SECRET,
    origin: "us",
    locale: "en_US",
  });

  const realmsResult = await getRealms(client);
  const realms = DEBUG ? realmsResult.slice(0, 5) : realmsResult;
  const results = [];

  for (const realm of realms) {
    console.log(chalk.cyan(`Searching on ${realm.name}...`));

    const auctionHouse = await getAuctionHouse(client, realm.id);
    const foundItems = findItemsById(auctionHouse, ITEM_ID);

    if (foundItems.length === 0) {
      console.log(chalk.red("No items found"));

      results.push({ name: realm.name, lowestPrice: null });
    } else {
      const cheapestItem = foundItems.reduce((acc, item) =>
        acc.buyout > item.buyout ? item : acc
      );

      console.log(
        chalk.green(
          "Lowest price:",
          chalk.underline(formatPrice(cheapestItem.buyout))
        )
      );

      results.push({
        name: realm.name,
        lowestPrice: cheapestItem.buyout,
      });
    }
  }

  await fs.writeFile("index.html", createHTML(results));

  const htmlPath = path.join(process.cwd(), "index.html");

  await open(htmlPath);
}

main();
