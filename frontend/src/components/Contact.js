import React from "react";
import { FaEnvelope } from "react-icons/fa";

function Contact() {
  return (
    <div className="main-content contact-page">
        <div className="container">
          <h1 className="page-title">Got Feedback? Holler at Us!</h1>

          <section className="section">
            <p className="section-content">
              Hey! We’re still cooking things up behind the scenes. Spot a bug? Got a feature idea? Just wanna say hi? 
              Click the envelope below and drop us a line!
            </p>
          </section>

          <section className="section">
            <a 
              href="mailto:kumuda.2388@gmail.com" 
              className="email-icon-link"
              title="Send us feedback"
            >
              <FaEnvelope size={32} />
            </a>
          </section>

          <section className="section">
            <p className="section-content">
              Every bit of feedback helps us make this platform finger-lickin’ awesome!
            </p>
          </section>
        </div>
      </div>
  );
}

export default Contact;