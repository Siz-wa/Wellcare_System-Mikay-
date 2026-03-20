// resources/js/pages/auth/register/index.tsx
import { Head } from "@inertiajs/react";
import { useState } from "react";
import RegisterBrandPanel from "@/pages/auth/register/sections/register-brand-panel";
import RegisterFormPanel  from "@/pages/auth/register/sections/register-form-panel";

export default function Register() {
  const [currentStep, setCurrentStep] = useState(1);

  return (
    <>
      <Head title="Create Account" />
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
        <RegisterBrandPanel currentStep={currentStep} />
        <RegisterFormPanel  onStepChange={setCurrentStep} />
      </div>
    </>
  );
}