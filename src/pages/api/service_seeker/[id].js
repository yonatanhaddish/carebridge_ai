import dbConnect from "../../../lib/mongoose";
import ServiceSeeker from "../../../models/ServiceSeeker";

export default async function handler(req, res) {
  await dbConnect();

  const { id } = req.query;

  console.log("eeeeeeeeeeeeeee", id);

  try {
    const seeker = await ServiceSeeker.findOne({ service_seeker_id: id });
    if (!seeker) {
      return res.status(404).json({ error: "Service seeker not found" });
    }
    console.log("444444444444", seeker);

    res.status(200).json({ seeker });
  } catch (err) {
    res.status(500).json({ error: "Server error fetching seeker" });
  }
}
