import Journal from "@/server/models/finance/Journal";

describe("inspect Journal module", () => {
  it("logs shape", () => {
    console.log("Journal is", typeof Journal);

    console.log("Journal keys", Object.keys(Journal as any));

    console.log("Journal.default type", typeof (Journal as any).default);

    console.log(
      "Journal.default keys",
      Object.keys((Journal as any).default || {}),
    );
  });
});
