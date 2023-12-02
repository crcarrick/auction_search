### Setup

Install dependencies

```shell
npm install
```

Obtain a battle.net API client id and client secret [here](https://develop.battle.net/access/clients/create)

1. Make up a Client Name
2. Leave Redirect URLs empty
3. Check "I do not have a service URL for this client.
4. Write something about Intended Use
5. Copy down your Client ID and Client Secreet

Open the `.env` file and fill in CLIENT_ID and CLIENT_SECRET eg.

```
CLIENT_ID=12345
CLIENT_SECRET=12345
```

### Usage

Use the following command where `--id` is the item ID of the item you wish to search for

```shell
npm start -- --id 123456
```