const CEREMONY_EMAIL = "ceremony@anchenandjoewedding.onmicrosoft.com";
const RECEPTION_EMAIL = "reception@anchenandjoewedding.onmicrosoft.com";

function normalise(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getEmail(user) {
  const claims = Array.isArray(user?.claims) ? user.claims : [];
  const emailClaim = claims.find((claim) =>
    [
      "email",
      "preferred_username",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
    ].includes(claim.typ),
  );
  return normalise(emailClaim?.val || user?.userDetails);
}

module.exports = async function (context, req) {
  const email = getEmail(req.body);
  let roles = [];

  if (email === CEREMONY_EMAIL) {
    roles = ["ceremony"];
  } else if (email === RECEPTION_EMAIL) {
    roles = ["evening"];
  }

  context.res = {
    status: 200,
    headers: { "Content-Type": "application/json" },
    body: { roles },
  };
};
