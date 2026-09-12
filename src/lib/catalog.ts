import bloodSuit from "@/assets/products/blood-suit.jpg";
import duoSuit from "@/assets/products/duo-suit.jpg";
import sexySuit from "@/assets/products/sexy-suit.jpg";

export type Product = {
  slug: string;
  name: string;
  category: "Women" | "Men" | "Accessories" | "Footwear";
  meta: string;
  price: number;
  images: string[];
  sizes: string[];
  colors: string[];
  description: string;
  atelier: string;
  isNew?: boolean;
  bestSeller?: boolean;
};

export const products: Product[] = [
  {
    slug: "gzaf-blood-suit",
    name: "GZAF Blood Suit",
    category: "Men",
    meta: "Black · Blood Red Stripes",
    price: 3500,
    images: [bloodSuit],
    sizes: ["M", "L", "XL"],
    colors: ["Black / Red"],
    description:
      "The signature GZAF tracksuit. Heavyweight black cotton blend with triple blood-red side stripes, embroidered GZAF chest mark and numbered leg detail. Cut oversized, built to move.",
    atelier: "GZAF Atelier · Cairo",
    isNew: true,
    bestSeller: true,
  },
  {
    slug: "gzaf-duo-suit",
    name: "GZAF Duo Suit",
    category: "Women",
    meta: "Unisex · Poppy Print",
    price: 3200,
    images: [duoSuit],
    sizes: ["M", "L", "XL"],
    colors: ["Black / Poppy"],
    description:
      "The Duo Suit — a matching hoodie and jogger set for two. Deep black brushed cotton scattered with hand-drawn poppies and a printed inner hood. Made to be worn as a pair, or on your own.",
    atelier: "GZAF Atelier · Cairo",
    isNew: true,
    bestSeller: true,
  },
  {
    slug: "gzaf-sexy-suit",
    name: "GZAF Sexy Suit",
    category: "Women",
    meta: "Red Camo · Contour Panels",
    price: 3800,
    images: [sexySuit],
    sizes: ["M", "L", "XL"],
    colors: ["Red Camo / Black"],
    description:
      "Body-contoured tracksuit in a custom GZAF red camouflage. Black centre panels shape the silhouette; piped seams follow the line. Full zip jacket with high collar and matching jogger.",
    atelier: "GZAF Atelier · Cairo",
    isNew: true,
  },
];

export const getProduct = (slug: string) =>
  products.find((p) => p.slug === slug);

export const categories = ["Women", "Men", "Accessories", "Footwear"] as const;
