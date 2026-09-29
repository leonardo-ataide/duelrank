export default function handler(request, response) {
  response.status(200).json({
    ok: true,
    message: "Rank Duel API is working"
  });
}
