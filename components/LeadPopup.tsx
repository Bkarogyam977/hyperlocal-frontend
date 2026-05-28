'use client';

import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';

export default function LeadPopup() {

  // POPUP OPEN/CLOSE
  const [open, setOpen] = useState(false);

  // FORM DATA
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
  });

  // AUTO OPEN AFTER 1 MINUTE
  useEffect(() => {

    const timer = setTimeout(() => {
      setOpen(true);
    }, 10000);

    return () => clearTimeout(timer);

  }, []);

  // INPUT CHANGE
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {

    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

  };

  // SUBMIT FORM
  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {

    e.preventDefault();

    // VALIDATION
    if (!formData.name || !formData.mobile) {

      Swal.fire({
        icon: 'warning',
        title: 'Required',
        text: 'Please fill all fields',
      });

      return;
    }

    try {

      const res = await fetch('/api/lead', {

        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify(formData),

      });

      const data = await res.json();

      if (data.message === 'Submitted successfully') {

        Swal.fire({
          icon: 'success',
          title: 'Success 🎉',
          text: data.message,
        });

        // RESET FORM
        setFormData({
          name: '',
          mobile: '',
        });

        // CLOSE POPUP
        setOpen(false);

      } else {

        Swal.fire({
          icon: 'error',
          title: 'Error ❌',
          text: data.message,
        });

      }

    } catch (error) {

      console.log(error);

      Swal.fire({
        icon: 'error',
        title: 'Server Error',
        text: 'Something went wrong',
      });

    }
  };

  return (
    <>
    {!open && (

  <button
    onClick={() => setOpen(true)}
    className="fixed bottom-20 right-6 z-50 bg-indigo-600 hover:bg-indigo-700 text-white w-15 h-15 rounded-full shadow-2xl flex items-center justify-center animate-bounce"
  >

    <img
      src="/pd_images/support.png"
      alt="Support"
      className="w-8 h-8 object-contain"
    />

  </button>

)}
      {open && (

      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-end z-50">

  <div className="relative w-[340px] h-[90vh] mr-4 rounded-l-[30px] overflow-hidden shadow-2xl animate-slideIn">

    {/* BACKGROUND */}
    <div className="absolute inset-0 bg-gradient-to-b from-indigo-700 via-purple-700 to-pink-600"></div>

    {/* CONTENT */}
    <div className="relative z-10 h-full bg-white/10 backdrop-blur-xl p-6">

      {/* CLOSE BUTTON */}
      <button
        onClick={() => setOpen(false)}
        className="absolute top-4 right-4 text-white text-3xl"
      >
        ×
      </button>

      {/* LOGO */}
      <div className="flex justify-center mt-4">
        <div className="bg-white p-3 rounded-full shadow-xl">
          <img
            src="/logo.jpg"
            alt="Logo"
            className="w-[110px] h-[110px] object-contain rounded-full"
          />
        </div>
      </div>

      {/* TITLE */}
      <h2 className="text-3xl font-bold text-center text-white mt-5">
        Connect With Us
      </h2>

      <p className="text-center text-white/80 text-sm mt-2 mb-8">
        Get Free Consultation & Business Growth Solutions
      </p>

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >

        {/* NAME */}
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white">
            👤
          </span>

          <input
            type="text"
            name="name"
            placeholder="Enter Your Name"
            value={formData.name}
            onChange={handleChange}
            className="w-full bg-white/20 border border-white/20 text-white placeholder:text-white/70 rounded-xl py-3 pl-12 pr-4 focus:outline-none"
          />
        </div>

        {/* MOBILE */}
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white">
            📞
          </span>

          <input
            type="tel"
            name="mobile"
            placeholder="Enter Mobile Number"
            value={formData.mobile}
            onChange={handleChange}
            className="w-full bg-white/20 border border-white/20 text-white placeholder:text-white/70 rounded-xl py-3 pl-12 pr-4 focus:outline-none"
          />
        </div>

        {/* BUTTON */}
        <button
          type="submit"
          className="w-full bg-white text-indigo-700 font-bold py-3 rounded-xl hover:scale-105 transition"
        >
          Get Free Consultation
        </button>

      </form>

      {/* FOOTER */}
      <div className="absolute bottom-5 left-0 right-0 text-center">
        <p className="text-white/80 text-sm">
          ⭐ Trusted by 500+ Businesses
        </p>
      </div>

    </div>

  </div>

</div>  

      )}
    </>
  );
}