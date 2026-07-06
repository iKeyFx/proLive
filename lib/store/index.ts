import { configureStore } from "@reduxjs/toolkit";
import pricesReducer from "@/lib/store/pricesSlice";
import accountReducer from "@/lib/store/accountSlice";

export function makeStore() {
  return configureStore({
    reducer: {
      prices: pricesReducer,
      account: accountReducer,
    },
    // Our state is plain JSON-safe data; default middleware checks are fine.
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
