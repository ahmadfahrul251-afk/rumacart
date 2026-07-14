UPDATE orders SET "shippingMethod" = 'DELIVERY' WHERE "shippingMethod" IN ('INSTANT', 'SAME_DAY');
