export interface Game {
  id: string;
  name: string;
  publisher: string;
  image: string;
  category: "Mobile" | "PC" | "Console";
  slug: string;
}

export interface Denomination {
  id: string;
  name: string;
  price: number;
  image?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  gameId: string;
  gameName: string;
  denomination: string;
  price: number;
  status: "pending" | "success" | "failed";
  createdAt: number;
  gameUserId: string;
  gameServerId?: string;
}
