export type CardanoNetwork = "preview" | "preprod";

export type CreationMethod = "sem IA" | "IA assistida" | "gerada por IA";

export type NativeScript = {
  type: "all";
  scripts: [
    { type: "sig"; keyHash: string },
    { type: "before"; slot: string }
  ];
};

export type NftMetadata = {
  name: string;
  image: string | string[];
  mediaType: string;
  description: string | string[];
  creator: string;
  creationMethod: CreationMethod;
  createdAt: string;
  sha256: string;
  project: string;
};

export type Cip25Metadata = {
  "721": Record<string, Record<string, NftMetadata>>;
};
