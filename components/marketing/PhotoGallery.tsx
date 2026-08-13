import Image from "next/image";
import { GALLERY_PHOTOS } from "@/lib/site-content";

export function PhotoGallery() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
      <div className="text-xs font-semibold uppercase tracking-wide text-brand">
        點滴時光
      </div>
      <h2 className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">
        與學生和家庭一起走過的日子
      </h2>

      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {GALLERY_PHOTOS.map((photo, i) => (
          <div
            key={photo.src}
            className={`overflow-hidden rounded shadow-card ${
              i === 0 ? "col-span-2 row-span-2" : ""
            }`}
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              width={900}
              height={900}
              className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
