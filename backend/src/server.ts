import "dotenv/config";
import { app } from "./app";
import { startShoppingPlanScheduler } from "./services/shoppingPlanReminder.service";

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`RumaCart backend jalan di http://localhost:${PORT}`);
  startShoppingPlanScheduler();
});
