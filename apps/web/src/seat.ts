export type Seat = {
  readonly username: string;
  readonly joinCode: string;
  readonly avatar: string;
  readonly pet: string;
};

export type SeatStore = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

const key = "audire-seat";

export const writeSeat = (store: SeatStore, seat: Seat) => {
  store.setItem(key, JSON.stringify(seat));
};

export const clearSeat = (store: SeatStore) => {
  store.removeItem(key);
};

export const readSeat = (store: SeatStore): Seat | undefined => {
  const raw = store.getItem(key);

  if (raw === null) {
    return undefined;
  }

  try {
    const value = JSON.parse(raw) as Partial<Seat>;

    if (
      typeof value.username === "string" &&
      value.username.length > 0 &&
      typeof value.joinCode === "string" &&
      value.joinCode.length === 6 &&
      typeof value.avatar === "string" &&
      typeof value.pet === "string"
    ) {
      return {
        username: value.username,
        joinCode: value.joinCode,
        avatar: value.avatar,
        pet: value.pet,
      };
    }
  } catch {
    return undefined;
  }

  return undefined;
};
