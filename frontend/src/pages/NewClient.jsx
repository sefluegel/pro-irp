// /frontend/src/pages/NewClient.jsx
import React from "react";
import ClientForm from "../components/ClientForm";

const NewClient = () => (
  <div className="p-8">
    <h2 className="text-2xl font-bold mb-4">Add New Client</h2>
    <ClientForm />
  </div>
);

export default NewClient;
