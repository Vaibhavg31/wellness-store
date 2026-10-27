SET NAMES utf8mb4;

-- Product-first homepage: the full-width banner slider opens the page, then the hero, then the category shelves.
-- Every other section keeps its existing relative order underneath. Safe to run more than once.
UPDATE `site_section_toggles` SET `sort_order` = `sort_order` + 10;
UPDATE `site_section_toggles` SET `sort_order` = 1 WHERE `section_key` = 'bannerSlider';
UPDATE `site_section_toggles` SET `sort_order` = 2 WHERE `section_key` = 'hero';
UPDATE `site_section_toggles` SET `sort_order` = 3 WHERE `section_key` = 'categoryShelves';
