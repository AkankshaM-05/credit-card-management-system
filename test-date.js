const dbDate = "2026-09-12";

console.log("DB value:", dbDate);

console.log(
    "new Date().toLocaleDateString():",
    new Date(dbDate).toLocaleDateString("en-GB")
);

console.log(
    "new Date().toISOString():",
    new Date(dbDate).toISOString()
);

const [year, month, day] = dbDate.split("-");

console.log(
    "Manual formatting:",
    `${day}-${month}-${year}`
);