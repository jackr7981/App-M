
-- Create agencies table
CREATE TABLE IF NOT EXISTS public.manning_agents (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    license_number text NOT NULL,
    company_name text NOT NULL,
    address text,
    contact_details text,
    owner_name text,
    validity_date text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.manning_agents ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" ON public.manning_agents FOR SELECT USING (true);

-- Clear existing data (optional, maybe we want to upsert)
TRUNCATE TABLE public.manning_agents;

INSERT INTO public.manning_agents (license_number, company_name, contact_details, validity_date) VALUES
('MLA-002', 'Unicorn Shipping Services Limited', 'Unicorn Shipping Services Limited
Address: Finlay House (4th Floor), 11 Agrabad, C/A, Chattogram
Tel : +88 031 712483 Fax : +88 031 713983
Email: unicornchittagong@unicornship.com
Web: www.unicornship.com
Capt. A.T.M
Anwarul Haque
26 May
2026', ''),
('MLA-003', 'Reliance Shipping Services', 'Reliance Shipping Services
Nur Chamber, (3rd Floor) 34,
Agrabad Commercial Area,
Chattogram-4100.
Mohammed
Abul Khair
29-05-
2026', ''),
('MLA-004', 'Universal Shipping Services', 'Universal Shipping Services
Room No-13, (6th Floor) 3/D, Kawran Bazar Road, Kabyaks
super market, Dhaka.
Phone: 01715331535, Tel: 8809611656255
E-mail:kak.uss.bd@gmail.com, rhs.uss.bd@gmail.com
Web: www.universalbd.org
K.A.Kabir 28 May
2026', ''),
('MLA-008', 'Haque & Sons Ltd.', 'Haque & Sons Ltd.
Rummana Haque Tower 1267/A,
Goshail Danga, Agrabad, Chattogram.
Tel : 031-716214-6, 710266, Fax : 031-710530, 710288
E-mail: haqsinsctg@haqsons.com
Emdadul
Haque
Chowdhury.
Managing
Director
28-05-
2026', ''),
('MLA-009', 'JF (Bangladesh) Limited', 'JF (Bangladesh) Limited
Address: Finlay House, 11- Agrabad
C/A, Chattogram. 
Ahamed
Quamrul Islam
Chowdhury
28 June
2026


Tel : 031-716321-5Fax : 031-710006, 710207
E-mail: jfbdltd@bdmail.net', ''),
('MLA-011', 'Marine (Agency) Services Ltd.', 'Marine (Agency) Services Ltd.
House No- 1 (4th Floor)Lane-5, Block -1, Road-1
Halishar Housing estate P.O- Rampur, Chattogram.
Tel : +88 031 727577, Phone: 017 30047450,
Fax : +88 031 727576
E-mail:operation@masbd.info
Web:www.masgroupbd.com
27-06-
2026', ''),
('MLA-013', 'Sigma Shipping Lines', 'Sigma Shipping Lines
House # 5C, Zakir Hossain Road,
Pahartali, Khulshi, Chattogram.
Tel : 031-711317 Fax : 031-2520536
E-mail: sigmaship@colbd.com
SK. Mohd.
Rafiqul Islam
17-06-
2026', ''),
('MLA-014', 'Printik Marine Services Limited', 'Printik Marine Services Limited
Akhtaruzzaman Centre (7th floor),
21/22 Agrabad Commercial Area,
Chittagong-4100
Tel: +8802333310525, Phone: 01730004257
E-mail: info@prantik.net, technical@prantik.net
Web: www.prantik.net
Engr. Md.
Golam Sarwar
Managing
Director
08-07-
2024', ''),
('MLA-022', 'Bay Shipping Services', 'Bay Shipping Services
The Heaven(5th Floor), 1335/A, Nikunja R/A,
South Khulshi, Chattogram-4202.
Tel : -88-031-2513879, Phone: 01833363448,
Fax : 88-031-2513878
E-mail: crew@bayshipping.net
Md. Azadur
Rahman
12.08.2027


Web: www.bayshipping.net', ''),
('MLA-023', 'International Marine Services', 'International Marine Services
House No. 317, Road No. 14 CDA
Agrabad, Chattogram.
Phone : 01715-024167,01718227411 Fax : 031-816895,
Tel-0443-4482026
E-mail:iimt@techno-bd.net.
Capt. Jafar
Ahmed
10-09-
2027', ''),
('MLA-024', 'PIL (Bangladesh) Ltd.', 'PIL (Bangladesh) Ltd.
IIUC Tower (5th Floor),Plot # 09,
Sk. Mujib Road, Agrabad C/A Chattogram.
Tel : 031-713301-6, 727791, Fax : 031-710301
E-mail:pildhk@citechco.net
Mr. Saber
Hossain
Chowdhury
19-10-
2027', ''),
('MLA-025', 'KSF Shipping Services', 'KSF Shipping Services
House # 131(3rd floor), Road # 17 CDA R/A,
Agrabad, Chattogram.
Tel : 031-711023, 711737 Fax : 031-710756
A.K.M. Faisal 12-05-
2026', ''),
('MLA-026', 'NYK Line (Bangladesh) Ltd.', 'NYK Line (Bangladesh) Ltd.
Land View Commercial Center(14th Floor) 28,
Gulshan North C/a,Culshan Circle-2, Dhaka-1212,
Tel: +88 02 8852703, Fax: +88 02 8852705
E-mail:bgd-info@bd.nykline.com
A.Z.M Tariqual
Islam
09-05-
2026

', ''),
('MLA-028', 'Bluestar Services Limited.', 'Bluestar Services Limited.
Bluestar House, House #12, Road#09, Block-J,
Baridhara (Progati Sarani Road) Dhaka-1212
Phone: +880-1819217093, Tel: +88-02-58814973
E-mail: info1@bluestarbd.com
Website: www.bluestarbd.com
Major M
Taneem Hasan
(Retd.)
Managing
Director
23-03-
2026', ''),
('MLA-030', 'Ever Cheer Marine Services', 'Ever Cheer Marine Services
Suit No. 703(6th Floor), South Land Centre 05,
Agrabad C/A. Chattogram-4100
Tel : +88-02333319485, +88-02333319487
Phone: +88-01819385474 Fax : +88-031-2523837
E-mail : info@evercheerbd.com,  evercheersl@ctgtel.net
Web: www.evercheerbd.com
Mohammed
Abbas Uddin
(Managing
Director)
20-04-
2023', ''),
('MLA-035', 'Shoreline ServicesLimited', 'Shoreline ServicesLimited
Delower Bhaban(4th Floor),
104 Agrabad C/A, Chattogram-4100
Tel : +88-02-333322814-15, Fax : +88-02-3333 11268
E-mail :info@shorelinbd.com
web: www.shorelinebd.com 
M. Nazrul
Hussain Tutul
Managing
Director
21-11-
2026', ''),
('MLA-036', 'S.K. Engineering', 'S.K. Engineering
House no.1159/1, Shahapur, Jamalpur
Tel: +88 01715032862
E-mail: info@slengineering.info
Md. Abdul
Mannan
15-04-
2025', ''),
('MLA-040', 'Asia Marine Agency', 'Asia Marine Agency
Al-Razi Complex (7th Floor) Suit # D-701,
166-167, Shaheed Syed Nazrul Islam Sarani, Purana Paltan,
Dhaka-1000
Tel- +880-2-9556768, 9556769. Fax- +880-2-9556770
Md. Reaz
Rahman
10-10-
2027


E-mail:infoama@asiatelnet.com', ''),
('MLA-044', 'B.N.F. Shipping Services', 'B.N.F. Shipping Services
Skay Lark point, Suit No-G2(6th floor),
24/A Bijoy nager, Dhaka
Tel: 9342987, Fax: 9350127
E-mail:bnfshipping@gmail.com
Habib Mohd.
Saifullah
27-06-
2026', ''),
('MLA-047', 'Aquamarine Bangladesh Ltd.', 'Aquamarine Bangladesh Ltd.
Comfort Niketon, House-77, Flat-2B, Road-4, Block-B,
Niketan, Gulshan-1, Dhaka-1212.
Tel.- +880-2-9840591-93, Phone. 0178 6434 642.
E-mail: crewing@aquamarinebd.com,
web: www.aquamarinebd.com
Managing
Director
15-08-
2024', ''),
('MLA-051', 'Mercantile Shipping Lines Ltd.', 'Mercantile Shipping Lines Ltd.
Fresh Villa, House No-15, Road No-34 Gulshan-1, Dhaka-1212.
Tel: +88 09666777055, +88-02  9889490, Fax: +88 02  9884896
E-mail: info@mgi.org
Web: www.mgi.org
Mostafa Kamal
Managing
Director
13-02-
2027', ''),
('MLA-060', 'Brave Royal Ship Management (BD) Limited', 'Brave Royal Ship Management (BD) Limited
Address: Kabir Manzil (4th Floor) Sheikh Mojib Road,
Agrabad C/A. Chattogram-4100
Pho-031-2510457, 2514780, Fax-031-2510458
E-mail: info@vmlbd.com
Mohammed
Shahjahan
Managing
Director
30 March
2027', ''),
('MLA-061', 'Vanguard Maritime Limited', 'Vanguard Maritime Limited
Afrif Chamber, 98-Agrabad C/A, Chattogram
Tel: +88 031 2510457 Fax-+88 031 2510458
E-mail-info@vmlbd.com
Nafid Nabi
Director
30-03-
2027

', ''),
('MLA-063', 'Sea Gold Shipping Services', 'Sea Gold Shipping Services
House No.-13(Ground Floor),
Road No.-3, Lane No.-5, Block-K, Halishahar, Chattogram
Ph. No.: +880-31-717132, Phone No. +880-1827566485
E-Mail: latif@seagoldshippingbd.com
Web : www.seagoldshippingbd.com
Md. Abdul
Latif
Managing
Director
06-03-
2026', ''),
('MLA-065', 'East Coast Shipping Lines Ltd', 'East Coast Shipping Lines Ltd
East Coast House,  138/A  CDA R/A, Road No. 01, Agrabad,
Chittagong.
Ph. No. : +880-31-710010, +880-31-713266, Phone No.:+88-
01755596449
E-Mail: Eastcoast@ecg.com.bd
Web :www.ecg.com.bd
Azam J.
Chowdhury     
Chairman
04-03-
2024', ''),
('MLA-067', 'Mariners Bangladesh Services Ltd.', 'Mariners Bangladesh Services Ltd.
Permanent Address: Vill-Bishnupur, Post-Mayura, Ps-Nangolkot,
Dist-Comilla.
Present Address: A R Tower, (Ground Floor), Rahamanbag,
Aggrabad Access road, Chattogram.  
Phone: +8801717791475
Email: marinersbdservices@gmail.com
Web: www.basmshipbd.com
Md.
Shahabuddin
Mozumder
(Managing
Director)
05-03-
2026', ''),
('MLA-070', 'Sea King Marine Services Limited', 'Sea King Marine Services Limited
10th Floor, Aktharuzzaman Center 21/22 Agrabad C/A,
Chattogram
Tel: +88 031-717253 Tel:+88-01844177255
E-mail: operation@skmsbd.com
Web : www.skmsbd.com
Anisur Rahman 17-06-
2026', ''),
('MLA-071', 'Unicorn Marine Ltd.', 'Unicorn Marine Ltd.
Sadharan Bima Sadan (2nd floor), 102, Agrabad C/A, Chittagong.
Tel: 031-727465 Fax: 031-713983
E-mail: marine@unicornship.com
Web: www.unicornship.com
Capt. Syed
Amir Ahmed
06-11-
2027

', ''),
('MLA-073', 'Naaf Marine Services', 'Naaf Marine Services
Portland Sattar Tower (5th Floor) 1776 Strand Road,
East of Barik Building, Agrabad, Chattogram
Tel: 031-717308-09, 2518660, Fax: 031-716101
E-mail : info@naafmarine.com
Capt. Md.
Salah Uddin
Chowdhury
09-09-
2026', ''),
('MLA-075', 'GSP Marine Services', 'GSP Marine Services
Meem Tower, House: 33 (2nd Floor), Road: 03, O.R. Nizam
Road,
East Nasirabad, Chattogram.
Tel: +880 31 652337, Phone: +880 1820547433
Capt. Rashidul
Hasan
Chowdhury
09-09-
2026', ''),
('MLA-076', 'Fazila Marine', 'Fazila Marine
House No.39, Road-07, Sector-12, Uttara, Dhaka-1230
Tel : +88 02 55085439, Fax: +88 02 55085439
Email : fazilamarine@yahoo.com,  info@fazilamarine.com
Web:  www.fazilamarine.com
Md. Jahangir
Hosain
10-09-
2026', ''),
('MLA-077', 'Shah Shipping Recruiting Agency', 'Shah Shipping Recruiting Agency
Address: Vill: Bokchar, Union: Jamirta, P.S: Singair, Dist:
Manikganj
Present: House-36, Road-3, Block A, PC Culture Housing,
Ring Road, Shyamoli, Mahammadpur, Dhaka-1207
Phone: 01730494427, 01799884008
Website:  www.ssrabd.com
E-mail: crew@shah-shipping.com
Shah Mominul
Islam
19 August
2026

', ''),
('MLA-080', 'A. Z. SHIPPING SERVICES', 'A. Z. SHIPPING SERVICES
Silver Castle, Bepari Para, Mosque-CDA by Lane, Agrabad,
Chattogram
Tel : 031-2524486, 031-2528581, 031-2520086(Res)
Cell: 880-1711380599, 880-1919380599, 880-1676071615
E-mail: gaffarazshipping@gmail.com
Md.Abdul
Gaffar
10-04-
2027', ''),
('MLA-081', 'Seafarers Placement Services', 'Seafarers Placement Services
House-X61/1, Road-3, Block-A, Chandgoa R/A, Chittagong.
& House-1, Road-1, Lane-5, Block-L, Halishahar Housing
Estate, Chattogram.
Tel: +88 031 2516314, Fax: +88 031 723161
Email: seafarersplacementservices@gmail.com
Mrs. Shaheda
Kasem
03-08-
2027', ''),
('MLA-082', 'JAR World Marine (Pvt) Limited', 'JAR World Marine (Pvt) Limited
Anayat Ali Member`s House, Middle Halishahar Monsipara,
P.O-Ananda Bazar, P.S. Bandar, Chittagong.
& Milinium Plaza (4th Floor), 2905, Agrabad Ex.
Road, Chattogram.
Tel: +88 031 2530011, Fax: +88 031 2514088
E-mail: shipmanning@jarship.com, jar@jargroup.biz
MD. Jinnat Ali 03-08-
2027', ''),
('MLA-083', 'Atlantic Shipping Services', 'Atlantic Shipping Services
House # 02, Road # 11, Block # F, Banani, Dhaka-1213
Tel. No: +880 2 9870536,9870885-6, Fax No: +880 2 9870536
Phone No: 880 1938444888, 01938444777
E-mail: crew@atlssmg.com
Web: www.atlssmg.com
Md. Tawrat Ali,
Chairman
19-12-
2025', ''),
('MLA-085', 'Golden Carrier Ship Management', 'Golden Carrier Ship Management
Tulatoli Road, Faujdarhat, Chittagong.
&  House # 10 (3rd Floor), Road # 31, Sector # 7,
Uttara, Dhaka-1230.
Maruf Md.
Jahirul Islam
20-12-
2025


Tel : 880-31-2781238-9Fax: 880-31-2781240
E-mail : maruf_engr77@yahoo.com', ''),
('MLA-088', 'S.S. Marine Service', 'S.S. Marine Service
House # 61, Road # 1, Bashundhara R/A, Dhaka-1230
Tel : 880-2-8401774, Fax: 880-2-8401774, Phoneil- +88
01841047450
E-mail : ssmarineservicee@gmail.com
Md. Nazmul
Haque
Propitor 
19-07-
2026', ''),
('MLA-089', 'ASP Crew Management Limited', 'ASP Crew Management Limited
House: 467(1 Floor), Road :31, Mohakhali DOHS, Dhaka-1206.
Tel: +88 02 9884312-7, +88 01711475995 Fax: +88 02
9883783/85
E-mail: mzaber@aspships.com
ASP Crew
Management
Limited
11-05-
2026', ''),
('MLA-092', 'Expert Associate Limited', 'Expert Associate Limited
House No: 5, Road # 3, Sector # 7, Uttara, Dhaka-1236
Tel: 880-27553573,Fax: 880 27553573 Cell: 01790356530
E-mail: info@expertassociate.biz, crewing@expertassociate.biz
Web : www.expertassociate.biz
S M Sirajul
Azad
License
suspended', ''),
('MLA-094', 'R.B.M Maritime Limited', 'R.B.M Maritime Limited
506, Omar Shajahan Tower (3rd Floor), Shah Kabir Mazar Road,
Azampur Railgate, Uttara, Dhaka-1230.
Tel. No.: +88-031-2515361,2511529
E-mail: info@rbmgroupbd.net.net.
Web : www.rbmgroupbd.net
Fazle Elahi 23-06-
2027

', ''),
('MLA-096', 'Ayar Shipping Services', 'Ayar Shipping Services
Kh Tower, (5th Floor), Plot # 10, Lane # 05, Road # 01,
Block # L, Arabad Access Road, Halishahar,Boropool,
Chattogram
Tel: 88-031-2517173, Fax: 88-031-2517173
E-mail: info@ayarship.com.
Capt. Syed
Imam Hossain
20-06-
2027', ''),
('MLA-097', 'South Asia Ship Crewing Agent', 'South Asia Ship Crewing Agent
Metro Plaza (4th Floor), 79/A- Sadarghat Road,
Room No- 501, Opposite Kali Bari, Chittagong.
Tel: 88-031-2853773, Fax: 88-031-2853774
E-mail: south.asia16@gmail.com , southasia16@southasiabd.net
Md. Kazi
Nazim Uddin
Proprietor
28-03-
2026', ''),
('MLA-098', 'Marine Hive Ltd.', 'Marine Hive Ltd.
25, Gorib-e-Newaz Avenue, Flat-A2 Sector#11,
Uttara Model Town Dhaka-1230
Ph:- +88 02 7913662
E-mail :crewing@marinehive.com
Web: www.marinehive.com
Omar Sharif
Arefeen
23-03-
2026', ''),
('MLA-099', 'Dolphin Maritime Services Limited', 'Dolphin Maritime Services Limited
Nishorgo (Ground Floor), House no-1, Road no-A/1,
Karnafuly R/A, Halishahar, Chittagong, Bangladesh.
S.M.A.Hannan 24-03-
2026', ''),
('MLA-101', 'Zebra Shipping Limited', 'Zebra Shipping Limited
15, Strand Road, Majhirghat, Chattogram-4000
Tel: 088031-618940,618975, Fax:088031-610067
Email: zebrashippingbd@gmail.com
Abdulla
IFekhar Chisty
Approval
Expired', ''),
('MLA-102', 'Sailor Bangladeah Limited', 'Sailor Bangladeah Limited
Suite no-1A,(1st floor), Entaj Ali Pradaise, 43/1/7,
Atish Diponkar Road, Sabuj Kanon, Basabo, Dhaka-1000
Md. Zafor
Sadik
13-03-
2027

', ''),
('MLA-103', 'Shobuj Bangla Shipping Service Limited', 'Shobuj Bangla Shipping Service Limited
House No : 13, Road No : 02, Lane No : 03 Block-K,
Halishahar, Chattogram-4216
Tel.No : +88-031-2527891, Phoneil. No. +880-1869579796
Fax No.: +88-031-2527891
E-mail:
crew@shbss.com.bd, info@shbss.com.bd, crew.shbss@gmail.com
Mrs. Tuhina
Akter
19-09-
2027', ''),
('MLA-104', 'Marine Fleet Shipping Limited', 'Marine Fleet Shipping Limited
74(1st Floor), Road No.-27, C.D.A R/A, Agrabad, Chittagong 4100
Tel: 880-31-714741, 2528631, Fax: 880-31-710025
E-mail: marinefleetbd@gmail.com, info@marinefleetbd.com,
Web: www.marinefleetbd.com
Md. Zakir
Hossain,
Managing
Director
25-09-
2027', ''),
('MLA-105', 'Global Ocean Shipping Services Ltd.', 'Global Ocean Shipping Services Ltd.
Flat No. B/2, House No.13, Road No.11, Sector No. 11,
Uttara Model Town, Dhaka-1230 
Bangladesh. Phone: 01781666777, 01672698555,
+880 2 8991547
Web- www.globalocenssl.com
E-Mail- operations@globaloceanssl.com
Kazi Abdul
Wadood Miah
Chairman
15-04-
2026', ''),
('MLA-106', 'Unipole Shipping Services', 'Unipole Shipping Services
Present Address: Chairman Center(2nd Floor),
House No-1, Road No.-2, Lane No-3, Gate No-9,
Block-K Halishahar H/E, P.C Road, Chittagong
Tel: 88-031-715614, Fax: 88-031-715614 
E-mail: crewing@unipoleshipping.com
Abdul Mannan 16 April
2026', ''),
('MLA-107', 'Good Luck Maritime Ltd.', 'Good Luck Maritime Ltd.
201, K.Y Tower, Gulbag, Agrabad Access Road,
Agarbad, Chattogram.
Mohabbat Ali
Siddique Apon
Chowdhury
15-04-
2026


Tel: +88 02333318388, Phone: +88 01756022448,
Email: info@goodluckmaritime.com, gdlm.crewing@gmail.com
Web: www.goodluckmaritime.com
Chairman', ''),
('MLA-108', 'Compass  Shipping Service Ltd.', 'Compass  Shipping Service Ltd.
Sultan Hajer Bari, Kusumpura, Kalarpool, Patiya,Chattogram.
Md. Atikur
Rahman
Managing
Director
09-12-
2026', ''),
('MLA-109', 'Elite Maritime Ltd.', 'Elite Maritime Ltd.
1557, Hazipara Singapore Market, Romm: 612, 5th floor,
Agrabad  Access Road, Chattogram.
Habibur
Rahman
Chairman
11-12-
2022', ''),
('MLA-110', 'NSP Shipping Services Ltd.', 'NSP Shipping Services Ltd.
Permanent Address: 349, North Shahjahan Pur,
P.O: Shantinagor, Thana: Shahjahan Pur, District: Dhaka.
Ph No.: +88-০2-48322127, 48321925-6, Phone:+880-1777543980
E-mail: niazmud4@yahoo.com, crewing@nspshipping.com
Captain Niaz
Muhammad
Managing
Director
12-12-
2026', ''),
('MLA-111', 'Sea Express Ltd.', 'Sea Express Ltd.
Shahidullah Bahabon, H-01/A (4th Floor), Road-02,
Lame-03, Block-K, Halishahar H/E, Halishahar, Chittagong
Phone: +88-0161 0383 868
E-mail: info@seaexpressltd.com
web: seaexpressltd.com
Mohammad
Abdullah
Chairman
07-04-
2027', ''),
('MLA-112', 'MSM Marine & Shipping Services', 'MSM Marine & Shipping Services
R.I. Tower (Level 6), 23/A M.M Ali Road, Mehedibag,
Chattogram-4000
Ph No.: +88-031-2859929, Phoneil +880-1844470870
Email: info@msmshippingservices.com
web: msmshippingservices.com 
Rumman
Sultana
Proprietor
25-06-
2027

', ''),
('MLA-113', 'Falcon Marine Services Ltd', 'Falcon Marine Services Ltd
Plot #21 (Ground Floor), Road #9/A, Nikunja R/A-1,
Khilkhet, Dhaka
Phone: +880-1748 196658, 01712 190562
E-mail: ashraf@fmslbd.com
web: www.bsmssl.com
Md. MD.
Monthachir
Rahman
Mondal
Managing
Director
28-06-
2027', ''),
('MLA-114', 'MariAid Limited', 'MariAid Limited
Rahima Concord, House No.-18(4th Floor),
Road No,-1, Sector No.-5, Uttara Model Town, Dhaka-1230.
Ph No.: +88-02-48956769, 01712 201060
Email: motin@mariaid.com
www.mariaid.com
Md. Abdul
Motin
Managing
Director
18-08-
2027', ''),
('MLA-116', 'Karnaphuli Maritime Limited', 'Karnaphuli Maritime Limited
HR Bhaban, 26/1 Kakrail, Dhaka- 1000
Ph.No. +880-2- 58310167-73,Fax  880 -2- 48314948,
Phone +8801730730525
E-mail: info@karnaphuli.com
Hamdan
Hossain
Chowdhury
Managing
Director
08-01-
2028', ''),
('MLA-117', 'Gemini Maritime Agency Bangladesh', 'Gemini Maritime Agency Bangladesh
Flat 6B, (7th Floor), House no: 245/1, & 247 South Paikpara,
Mirpur, Dhaka-1216
Ph. No. +880-1810020098
E-mail: info@geminimaritimebd.com
web: www.geminimaritimebd.com
S.M.
Sazzedeen
Proprietor
14-06-
2026

', ''),
('MLA-118', 'Forazi Shipping Limited', 'Forazi Shipping Limited
Permanent & Present Address: Finlay House (4th Floor),
11 Agrabad C/A, Chattogram-4100.
Ph. No. +880-1629 722 247
E-Mmail: info@fsltd.net
F.M. Tariqul
Islam
Chairman
 14 June
2026', ''),
('MLA-119', 'Green Ship Services', 'Green Ship Services
Castle Queen, 4/B, House No.- 8, Road No.- 2, Lane No.-2,
Block-G, Halishahar, Chattogram
Permanent address- Shluk Mura, Bhubanghar,
Post code: 3500, Kotrwali Model, Cumilla
Ph. No. +880-2333311618, Phoneil +880 1915 955 942
E-Mmail: operation@greenshippingservice.com
Web www.greenshippingservice.comt
Rakibul Hasan
Proprietor
 14-06-
2026', ''),
('MLA-120', 'Royal Marine Management', 'Royal Marine Management
Permanent & Present Address: Hashem Tower (1st Floor),
M.A.Aziz Road, South Halishahar, Chittagong-4100
Phone: 018163-62109
E-mail: royalmarine1975@yahoo.com
Web: www.royalmarinebd.com
Mohammed
Sailm
Proprietor
20-12-
2024', ''),
('MLA-121', 'K-line Maritime CO. Limited', 'K-line Maritime CO. Limited
Akhi Palace, House: 01, Road: 01, Lane: 02, Block: G,
Boropool, Halishahar, Chattogra.
Call: +880-01923-459015 TNT: +880-02333324113
E-mail: klinemaritime@yahoo.com
Web: www.k-linemaritime.com
Mohammad
Azizur Rahman
Chairman
15-01-
2027

', ''),
('MLA-122', 'Ocean Hub Ltd', 'Ocean Hub Ltd
F-10, House: 17, Sector: 13, Uttara, Dhaka
Phone: 02-48956150, Phone: 01880282126
E-mail: crewing@oceanhubbd.com
web: www.oceanhubbd.com
Ghulam
Quddus Khan
Chairman
15-01-
2027', ''),
('MLA-123', 'CK Maritime Ltd.', 'CK Maritime Ltd.
Permanent Address: 30/A, Noya Palton, Sattar Tower (10th Floor)
V.I.P Road, Dhaka-1000
& Present Address: House-836, Apt-8A, Road-12,
Avenue-3, Mirpur DOHS, Dhaka-1216
Phone: +880 1710850109
E-mail: info@ckmaritimebd.com
web: www.ckmaritimebd.com
Captain
Md.Mostahidur
Rahman Khan
Managing
Director
09-04-
2027', ''),
('MLA-124', 'Bluewave Shipping Pvt. Ltd.', 'Bluewave Shipping Pvt. Ltd.
Permanent Address: House-50, Garib-E-Newaz Avenue Road,
Section-13, Uttara-1230, Dhaka.
Present Address: 522 SK, Mujib Road, 3rd Floor, Choumohoni,
Agrabad, Chattogram-4100.
Phone: 01894800459
E-mail:crewing@bluewaveshippingservices.com
Web: www.bluewaveshippingservices.com
09-04-
2027

', ''),
('MLA-125', 'Aristocarat Merchant Marine Services Limited.', 'Aristocarat Merchant Marine Services Limited.
Permanent Address: Bismillah Tower, 580/7, North Kafrul, Dhaka
Cantonment, Dhaka-1206
Present Address: 501/5, East Kazipara, Kafrul, Mirpur,
Dhaka, Bangladesh.
Phone: 01521516198
E-mail:Crewing@aristocratbd.com
Web: www.aristocratbd.com
11-04-
2027', ''),
('MLA-126', 'QNS Intermodal Logistic Limited.', 'QNS Intermodal Logistic Limited.
Permanent Address: Aziz Court (22th Floor), 88-89,
Agrabad C/A, Chattogram.
Present Address: Aziz Court (22th Floor), 88-89,
Agrabad C/A, Chattogram.
Phone: 01897-657619
E-mail: intermodal@qnscorp.com
Web: www.qnsglobal.com
11-04-
2027', ''),
('MLA-127', 'Vigilant Shipping Ltd.', 'Vigilant Shipping Ltd.
Permanent Address: Flat No-5B, House No: 10,
Road: Main Road, Block: K, South Banasree, Khilgaon, Dhaka 1219
Present Address: Flat No-5B, House No: 10, Road: Main Road,
Block: K, South Banasree, Khilgaon, Dhaka-1219
Phone: +8801325061572, Tel: +880258054529
E-mail:info@vigilantshippingbd.com
Web: www.vigilantshippingbd.com
Maksuda Afroz
Chowdhury
Managing
Director
22-08-
2027

', ''),
('MLA-128', 'Capella Shipping Services.', 'Capella Shipping Services.
Permanent Address: 10/A, Road-06, Plot-1, Pallabi,
Mirpur, Dhaka-1216.
Present Address: 10/A, Road-06, Plot-1, Pallabi,
Mirpur, Dhaka-1216.
Tel: +880258054529, Phone: +8801684206292
E-mail: info@capellashippingservices.com
Web: www.capellashippingservices.com
Chowdhury
Arif Uddin
Ahmed
Managing
Partner
22-08-
2025', ''),
('MLA-130', 'Premier Marine Services.', 'Premier Marine Services.
Permanent Address: House: 17, (Level-02, Flat-F/4),
Road: 14, Sector-13, Uttara Model Town, Dhaka-1230.
Present Address: 17, (Level-02, Flat-F/4), Road: 14,
Sector-13, Uttara Model Town, Dhaka-1230.
Tel: +8802-55087530, Phone: +8801790191021,
E-mail: info@prmsbd.com
Web: www.prmsbd.com
Tajnina Sultana
Proprietor
17-09-
2025', ''),
('MLA-131', 'AHP Marine Services', 'AHP Marine Services
Present Address: Road No: 17, House No: 111/B,
2nd Floor, Agrabad, CDA Residential Area, Port, Chittagong.
Permanent Address: Mo: Abul Hossain House,
North Patenga Dhum Para, Po: Middle Patenga,
Upazila: Patenga, District: Chittagong
Phone: +8801919672368
Abul Haiat
Ahammod
Gani
Managing
Partner
02 June
2026', ''),
('MLA-132', 'NTN Oceanic Pledge Ltd.', 'NTN Oceanic Pledge Ltd.
Permanent Address: Tonmoy Nir, Madhumallar Dangi,
Khulna Road Mor, Satkhira.
Present Address: “Isabella Tower” Level-9A (8th Floor),
Plot No:1&3, Road-7, Block-G, Boropool,
Halishahar Housing Estate Chattogram. 
Phone: +8802333313216, +8801719031737
E-mail: info@ntnopltd.com.bd
Website: www.ntnopltd.com.bd
Sadat Al
Kabeju
(Managing
Director)
02-06-
2026

', ''),
('MLA-133', 'Divine Marine Services Bangladesh Ltd.', 'Divine Marine Services Bangladesh Ltd.
Permanent & Present Address: B-7 (7th Floor), House-75, Road 14, Sector-13, Uttara, Dhaka. 
Phone: +880241360049, Mobile: +8801974958689
E-mail: info@dmsbl.com.bd
Website: www.dmsbl.com.bd
Joynul
(Managing
Director)
17
September
2026', ''),
('MLA-134', 'Glory-Wind Shipping Services Pvt. Ltd.', 'Glory-Wind Shipping Services Pvt. Ltd.
Permanent & Present Address: House No-07.
Road No-07, Block-G, Boropool,
Halishahar H/E, Chattagram.
Phone: +880 1610-959446
Email: glorywindltd@gmail.com
Web: www.glorywindpvt.com
Md. Faisal
Isdanie
(Managing
Director)
17
September
2026', ''),
('MLA-135', 'Efficient Global Limited', 'Efficient Global Limited
Permanent & Present Address: House No-101, (3rd Floor left)
Road No-06,
Railway Housing Society, Akbarsha, Chattogram.
Phone: 02333379452, Mobile: 01973215984
E-mail: info@efficientglobalbd.com 
Web: www.efficientglobalbd.com
Taslima Alam
(Managing
Director)
05-10-
2026', ''),
('MLA-136', 'Pride Shipping Lines', 'Pride Shipping Lines
Permanent & Present  Address: Akhtaruzzaman Centre
(11th Floor) 21/22, Agrabad C/A, Chattogram.
Phone: +8801706171343
E-mail: pride@colbd.com
Web: www.prideshippingbd.com
Proprietor
Md. Nazrul
Islam
12-02-
2027', ''),
('MLA-137', 'Tiger Shipping Services', 'Tiger Shipping Services
Permanent Address: Vill-Batikamari, P.O: Batikamari, P.S:
Sarisabari, Dist: Jamalpur.
Present Address: TGB, MDC BM Port View, Titas Tower (Ground
Floor),
Chatopole, Road, Boropole, Halishahar, Chattagram.
Phone: +880 1715365213
Email: belalh63@gmail.com
Web: www.tigershippingbd.com
Mohammad
Bellal Hossain
(Managing
Partner)
23-03-
2027', ''),
('MLA-138', 'Eureka Ship Management', 'Eureka Ship Management 
Permanent  & Present Address: 23, Captain Shahid Monsur Ali
Road,
Syed Md.
Sajid-Ul-Enam
(Managing
Partner)
12-05-
2027


(3rd Floor), Flat:3/A, Ramana, Dhaka-1217
Phone: +880 1911666828
Email: sajid.marine@gmail.com
Web: www.esmbd.com', ''),
('MLA-139', 'Imperial Shipping Services', 'Imperial Shipping Services
Permanent Address: 136/6, Pakuria Road, Beside Uttara Sector 14, Ps-Turag, Dist-Dhaka.
Present Address: 10/6, Baigartek, Dhaka Cantonment, Pallabi,
Dhaka.
Phone: +8801841974774
Email: info@impshipping.com
Web: www.impshipping.com
Mohammad
Saidul Islam
(Managing
Director)
20-05-
2027', ''),
('MLA-140', 'Sunrise International Shipping Company', 'Sunrise International Shipping Company
Permanent Address: Vill:West khada, P.O: Rayanda, P.S:
Sarankhola, Dist: Bagerhat 
Present Address: Flat: 6D, Mamtaj Villa: 10, Plot: 4, Block: F,
Road: S-1, Eastern Housing, Pallabi 2nd Phase, Rupnagar,
Mirpur, Dhaka-1216
Phone: +8801761-950568
Email: crewing@sunriseintshipping.com
Web: www. sunriseintshipping.com
Omar Jahan Al
Bayas
(Chairman)
25-08-
2027
', '');