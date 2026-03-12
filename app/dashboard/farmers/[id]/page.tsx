"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { getFarmerById, updateFarmer, deleteFarmer } from "@/lib/actions/farmers";
import { createCrop, updateCrop, deleteCrop } from "@/lib/actions/crops";
import { US_STATES, CROP_TYPES } from "@/types/database";
import type { Crop } from "@/types/database";

export default function FarmerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const farmerId = params.id as string;

  const [farmer, setFarmer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showAddCrop, setShowAddCrop] = useState(false);
  const [editingCropId, setEditingCropId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [error, setError] = useState("");

  // Edit farmer form state
  const [editForm, setEditForm] = useState({
    full_name: "",
    business_name: "",
    email: "",
    phone: "",
    county: "",
    state: "",
    address: "",
    city: "",
    zip: "",
    fsa_farm_number: "",
    fsa_tract_number: "",
    notes: "",
  });

  // Add crop form state
  const [cropForm, setCropForm] = useState({
    crop_type: "",
    base_acres: "",
    planted_acres: "",
    payment_yield: "",
    arc_county_elected: false,
    plc_elected: false,
    program_year: "2024",
  });

  useEffect(() => {
    loadFarmer();
  }, [farmerId]);

  async function loadFarmer() {
    setLoading(true);
    const data = await getFarmerById(farmerId);
    if (!data) {
      router.push("/dashboard/farmers");
      return;
    }
    setFarmer(data);
    setEditForm({
      full_name: data.full_name || "",
      business_name: data.business_name || "",
      email: data.email || "",
      phone: data.phone || "",
      county: data.county || "",
      state: data.state || "",
      address: data.address || "",
      city: data.city || "",
      zip: data.zip || "",
      fsa_farm_number: data.fsa_farm_number || "",
      fsa_tract_number: data.fsa_tract_number || "",
      notes: data.notes || "",
    });
    setLoading(false);
  }

  async function handleSaveEdit() {
    setError("");
    const result = await updateFarmer(farmerId, {
      full_name: editForm.full_name.trim(),
      business_name: editForm.business_name.trim() || undefined,
      email: editForm.email.trim() || undefined,
      phone: editForm.phone.trim() || undefined,
      county: editForm.county.trim(),
      state: editForm.state,
      address: editForm.address.trim() || undefined,
      city: editForm.city.trim() || undefined,
      zip: editForm.zip.trim() || undefined,
      fsa_farm_number: editForm.fsa_farm_number.trim() || undefined,
      fsa_tract_number: editForm.fsa_tract_number.trim() || undefined,
      notes: editForm.notes.trim() || undefined,
    });

    if (result.error) {
      setError(result.error);
      return;
    }

    setEditing(false);
    loadFarmer();
  }

  async function handleDeleteFarmer() {
    await deleteFarmer(farmerId);
  }

  function resetCropForm() {
    setCropForm({
      crop_type: "",
      base_acres: "",
      planted_acres: "",
      payment_yield: "",
      arc_county_elected: false,
      plc_elected: false,
      program_year: "2024",
    });
  }

  async function handleAddCrop() {
    setError("");
    if (!cropForm.crop_type) {
      setError("Select a crop type.");
      return;
    }

    const result = await createCrop({
      farmer_id: farmerId,
      crop_type: cropForm.crop_type,
      base_acres: parseFloat(cropForm.base_acres) || 0,
      planted_acres: parseFloat(cropForm.planted_acres) || 0,
      payment_yield: parseFloat(cropForm.payment_yield) || 0,
      arc_county_elected: cropForm.arc_county_elected,
      plc_elected: cropForm.plc_elected,
      program_year: parseInt(cropForm.program_year) || 2024,
    });

    if (result.error) {
      setError(result.error);
      return;
    }

    setShowAddCrop(false);
    resetCropForm();
    loadFarmer();
  }

  async function handleEditCrop(crop: Crop) {
    setEditingCropId(crop.id);
    setShowAddCrop(false);
    setCropForm({
      crop_type: crop.crop_type,
      base_acres: crop.base_acres.toString(),
      planted_acres: crop.planted_acres.toString(),
      payment_yield: crop.payment_yield.toString(),
      arc_county_elected: crop.arc_county_elected,
      plc_elected: crop.plc_elected,
      program_year: crop.program_year.toString(),
    });
  }

  async function handleSaveCropEdit() {
    if (!editingCropId) return;
    setError("");

    const result = await updateCrop(editingCropId, farmerId, {
      crop_type: cropForm.crop_type,
      base_acres: parseFloat(cropForm.base_acres) || 0,
      planted_acres: parseFloat(cropForm.planted_acres) || 0,
      payment_yield: parseFloat(cropForm.payment_yield) || 0,
      arc_county_elected: cropForm.arc_county_elected,
      plc_elected: cropForm.plc_elected,
      program_year: parseInt(cropForm.program_year) || 2024,
    });

    if (result.error) {
      setError(result.error);
      return;
    }

    setEditingCropId(null);
    resetCropForm();
    loadFarmer();
  }

  async function handleDeleteCrop(cropId: string) {
    const result = await deleteCrop(cropId, farmerId);
    if (result.error) {
      setError(result.error);
      return;
    }
    loadFarmer();
  }

  function handleProgramToggle(program: "arc" | "plc") {
    if (program === "arc") {
      setCropForm((prev) => ({
        ...prev,
        arc_county_elected: !prev.arc_county_elected,
        plc_elected: !prev.arc_county_elected ? false : prev.plc_elected,
      }));
    } else {
      setCropForm((prev) => ({
        ...prev,
        plc_elected: !prev.plc_elected,
        arc_county_elected: !prev.plc_elected ? false : prev.arc_county_elected,
      }));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!farmer) return null;

  const crops: Crop[] = farmer.crops || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/dashboard/farmers"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
      >
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Farmers
      </Link>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Farmer Info Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {editing ? (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Edit Farmer
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                <input
                  type="text"
                  value={editForm.business_name}
                  onChange={(e) => setEditForm({ ...editForm, business_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={editForm.city}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">County *</label>
                <input
                  type="text"
                  value={editForm.county}
                  onChange={(e) => setEditForm({ ...editForm, county: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                <input
                  type="text"
                  value={editForm.zip}
                  onChange={(e) => setEditForm({ ...editForm, zip: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                <select
                  value={editForm.state}
                  onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                >
                  {US_STATES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">FSA Farm #</label>
                <input
                  type="text"
                  value={editForm.fsa_farm_number}
                  onChange={(e) => setEditForm({ ...editForm, fsa_farm_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">FSA Tract #</label>
                <input
                  type="text"
                  value={editForm.fsa_tract_number}
                  onChange={(e) => setEditForm({ ...editForm, fsa_tract_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{farmer.full_name}</h1>
                  <p className="text-sm text-gray-500">
                    {farmer.business_name && `${farmer.business_name} · `}
                    {farmer.county} County, {farmer.state}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(true)}
                  className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Edit
                </button>
                {deleteConfirm ? (
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-red-600">Are you sure?</span>
                    <button
                      onClick={handleDeleteFarmer}
                      className="px-3 py-1.5 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700"
                    >
                      Yes, Delete
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(false)}
                      className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    className="px-3 py-1.5 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Crops</p>
                <p className="text-lg font-semibold text-gray-900 mt-0.5">{crops.length}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total Base Acres</p>
                <p className="text-lg font-semibold text-gray-900 mt-0.5">
                  {crops.reduce((sum, c) => sum + (c.base_acres || 0), 0).toFixed(1)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide">FSA Farm #</p>
                <p className="text-lg font-semibold text-gray-900 mt-0.5">
                  {farmer.fsa_farm_number || "—"}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide">FSA Tract #</p>
                <p className="text-lg font-semibold text-gray-900 mt-0.5">
                  {farmer.fsa_tract_number || "—"}
                </p>
              </div>
            </div>

            {/* Contact & Location Details */}
            <div className="mt-4 grid grid-cols-2 gap-4">
              {(farmer.email || farmer.phone) && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Contact</p>
                  {farmer.email && <p className="text-sm text-gray-700">{farmer.email}</p>}
                  {farmer.phone && <p className="text-sm text-gray-700">{farmer.phone}</p>}
                </div>
              )}
              {(farmer.address || farmer.city) && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Address</p>
                  <p className="text-sm text-gray-700">
                    {farmer.address && `${farmer.address}, `}
                    {farmer.city && `${farmer.city}, `}
                    {farmer.state} {farmer.zip}
                  </p>
                </div>
              )}
            </div>

            {farmer.notes && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-100 rounded-lg">
                <p className="text-xs text-yellow-600 font-medium uppercase tracking-wide mb-1">Notes</p>
                <p className="text-sm text-gray-700">{farmer.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Crops Section */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Crops & Program Elections</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              ARC-CO and PLC elections for this farm&apos;s covered commodities
            </p>
          </div>
          <button
            onClick={() => {
              resetCropForm();
              setShowAddCrop(true);
              setEditingCropId(null);
            }}
            className="inline-flex items-center px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Crop
          </button>
        </div>

        {/* Add / Edit Crop Form */}
        {(showAddCrop || editingCropId) && (
          <div className="p-5 bg-green-50/50 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              {editingCropId ? "Edit Crop" : "Add New Crop"}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Crop Type *</label>
                <select
                  value={cropForm.crop_type}
                  onChange={(e) => setCropForm({ ...cropForm, crop_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                >
                  <option value="">Select crop...</option>
                  {CROP_TYPES.map((crop) => (
                    <option key={crop} value={crop}>{crop}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Program Year</label>
                <select
                  value={cropForm.program_year}
                  onChange={(e) => setCropForm({ ...cropForm, program_year: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                >
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Base Acres</label>
                <input
                  type="number"
                  value={cropForm.base_acres}
                  onChange={(e) => setCropForm({ ...cropForm, base_acres: e.target.value })}
                  placeholder="0"
                  step="0.1"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Planted Acres</label>
                <input
                  type="number"
                  value={cropForm.planted_acres}
                  onChange={(e) => setCropForm({ ...cropForm, planted_acres: e.target.value })}
                  placeholder="0"
                  step="0.1"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Payment Yield (bu/acre)
                </label>
                <input
                  type="number"
                  value={cropForm.payment_yield}
                  onChange={(e) => setCropForm({ ...cropForm, payment_yield: e.target.value })}
                  placeholder="0"
                  step="0.1"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="text-xs text-gray-400 mt-0.5">From your FSA-578</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Program Election
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleProgramToggle("arc")}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                      cropForm.arc_county_elected
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    ARC-CO
                  </button>
                  <button
                    type="button"
                    onClick={() => handleProgramToggle("plc")}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                      cropForm.plc_elected
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    PLC
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Crops must be enrolled in either ARC-CO or PLC (not both)
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button
                onClick={() => {
                  setShowAddCrop(false);
                  setEditingCropId(null);
                  resetCropForm();
                }}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={editingCropId ? handleSaveCropEdit : handleAddCrop}
                className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                {editingCropId ? "Save Changes" : "Add Crop"}
              </button>
            </div>
          </div>
        )}

        {/* Crop List */}
        {crops.length === 0 && !showAddCrop ? (
          <div className="p-8 text-center">
            <svg
              className="mx-auto h-10 w-10 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-500">
              No crops added yet. Add crops to enable program analysis.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {crops.map((crop) => (
              <div
                key={crop.id}
                className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                    <span className="text-amber-700 text-xs font-bold">
                      {crop.crop_type.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{crop.crop_type}</p>
                    <p className="text-xs text-gray-500">
                      {crop.base_acres} base · {crop.planted_acres} planted ·{" "}
                      {crop.payment_yield} bu/ac · {crop.program_year}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      crop.arc_county_elected
                        ? "bg-blue-100 text-blue-700"
                        : crop.plc_elected
                        ? "bg-purple-100 text-purple-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {crop.arc_county_elected
                      ? "ARC-CO"
                      : crop.plc_elected
                      ? "PLC"
                      : "No Election"}
                  </span>
                  <button
                    onClick={() => handleEditCrop(crop)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                    title="Edit crop"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteCrop(crop.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete crop"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generate Report CTA */}
      {crops.length > 0 && (
        <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Ready to analyze?</h3>
              <p className="text-sm text-green-100 mt-0.5">
                Generate an AI-powered ARC/PLC optimization report for {farmer.full_name}
              </p>
            </div>
            <Link
              href={`/dashboard/reports/new?farmer=${farmerId}`}
              className="px-5 py-2.5 bg-white text-green-700 text-sm font-semibold rounded-lg hover:bg-green-50 transition-colors shadow-sm"
            >
              Generate Report — $39
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
