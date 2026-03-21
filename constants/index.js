export const WAREHHOUSE_ID = 2;
export const IS_PROD = process.env.NEXT_PUBLIC_IS_PROD === "true";
export const SHORTAGE_ID = IS_PROD ? 3 : 4;