import { prisma } from "@/lib/db";
import { ApprovalRequired } from "@/components/ApprovalRequired";
import { getUserStatus, isApproved } from "@/lib/approval";

export default async function ItineraryPage() {
  if (!isApproved(await getUserStatus())) return <ApprovalRequired what="The itinerary" />;

  const trip = await prisma.trip.findFirst();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">🗓️ Trip Itinerary</h1>

      {trip ? (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-purple-100 p-6">
            <h2 className="text-xl font-bold text-purple-700 mb-4">{trip.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {trip.destination && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Destination</p>
                  <p className="font-medium text-gray-800">📍 {trip.destination}</p>
                </div>
              )}
              {(trip.startDate || trip.endDate) && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Dates</p>
                  <p className="font-medium text-gray-800">
                    📅{" "}
                    {trip.startDate && new Date(trip.startDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    {trip.startDate && trip.endDate && " – "}
                    {trip.endDate && new Date(trip.endDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {trip.description && (
            <div className="bg-white rounded-2xl border border-purple-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-3">📝 About</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{trip.description}</p>
            </div>
          )}

          {trip.itinerary && (
            <div className="bg-white rounded-2xl border border-purple-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-3">📋 Schedule</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{trip.itinerary}</p>
            </div>
          )}

          {trip.lodging && (
            <div className="bg-white rounded-2xl border border-purple-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-3">🏠 Lodging</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{trip.lodging}</p>
            </div>
          )}

          {trip.meals && (
            <div className="bg-white rounded-2xl border border-purple-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-3">🍕 Meals</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{trip.meals}</p>
            </div>
          )}

          {!trip.itinerary && !trip.lodging && !trip.meals && !trip.description && (
            <div className="text-center py-12 text-gray-400">
              <div className="text-5xl mb-3">🏕️</div>
              <p>Itinerary details coming soon!</p>
              <p className="text-sm mt-2">The admin is still planning the adventure.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-3">🏕️</div>
          <p>No trip found yet.</p>
        </div>
      )}
    </div>
  );
}
