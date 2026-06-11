export default function Footer() {
  return (
    <footer className="bg-black text-white pt-14 pb-8 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-6">

        {/* COMPANY */}
        <div>
          <div className="flex items-center gap-2 mb-5">
            <img
              src="/logo.jpg"
              alt="Logo"
              className="w-14 h-14 rounded-full object-contain bg-white p-1"
            />
            <h3 className="text-2xl font-bold">ConnectUs</h3>
          </div>
          <p className="text-gray-400 leading-7 text-sm">
            We provide premium website development,
            software solutions, digital marketing,
            and branding services for businesses.
          </p>
        </div>

        {/* SERVICES */}
        <div>
          <h3 className="text-xl font-semibold mb-5">Services</h3>
          <ul className="space-y-3 text-gray-400">
            <li>🌐 Website Development</li>
            <li>📱 App Development</li>
            <li>💻 Software Development</li>
            <li>📈 Digital Marketing</li>
          </ul>
        </div>

        {/* CONTACT (column 3 only) */}
        <div className="md:col-span-1">
          <h3 className="text-xl font-semibold mb-5">Contact Us</h3>
          <ul className="space-y-4 text-gray-400">
            <li>📍 Lucknow, Uttar Pradesh</li>
            <li>📞 +91 9876543210</li>
            <li>✉️ info@connectuscorp.com</li>
          </ul>
        </div>

        {/* MAP (spans columns 4 and 5) */}
        <div className="md:col-span-2 w-[88%] h-64 ml-15 rounded-lg overflow-hidden border border-gray-700">
  <iframe
    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3559.717046496674!2d80.94616631504382!3d26.84669398315859!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x399be2f1c1f3b2a7%3A0x8f6e3f6f6f6f6f6f!2sLucknow%2C%20Uttar%20Pradesh!5e0!3m2!1sen!2sin!4v1716370000000!5m2!1sen!2sin"
    width="100%"
    height="100%"
    style={{ border: 0, borderRadius: '0.5rem' }}  // add radius directly to iframe
    allowFullScreen
    loading="lazy"
    referrerPolicy="no-referrer-when-downgrade"
  ></iframe>
</div>


      </div>

      {/* BOTTOM */}
      <div className="border-t border-gray-800 mt-10 pt-6 text-center text-gray-500 text-sm">
        © 2026 ConnectUs . All Rights Reserved.
      </div>
    </footer>
  );
}
