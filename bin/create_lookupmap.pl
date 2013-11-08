#!/usr/bin/perl
use Image::Magick;

my $step = 5;

my $outfile = shift || "lookup.js";
my $flag_dir = shift || "HTDOCS/img/flags";
my $imagemap = shift || "atlas/countrymap.png";

my $image = Image::Magick->new;
$i = $image->Read($imagemap);
@pixels = $image->GetPixel(x=>1,y=>1);

my $height = $image->Get('rows');
my $width = $image->Get('columns');

my @supermem;
my @countryindex;
my $idx = 0;

my %ccs = (
	BD=>"Bangladesh", 
	BE=>"Belgium", 
	BF=>"Burkina Faso", 
	BG=>"Bulgaria", 
	BA=>"Bosnia and Herzegovina", 
	BN=>"Brunei", 
	BO=>"Bolivia", 
	JP=>"Japan", 
	BI=>"Burundi", 
	BJ=>"Benin", 
	BT=>"Bhutan", 
	JM=>"Jamaica", 
	BW=>"Botswana", 
	BR=>"Brazil", 
	BS=>"The Bahamas", 
	BY=>"Belarus", 
	BZ=>"Belize", 
	RU=>"Russia", 
	RW=>"Rwanda", 
	RS=>"Republic of Serbia", 
	LT=>"Lithuania", 
	LU=>"Luxembourg", 
	LR=>"Liberia", 
	RO=>"Romania", 
	GW=>"Guinea Bissau", 
	GT=>"Guatemala", 
	GR=>"Greece", 
	GQ=>"Equatorial Guinea", 
	GY=>"Guyana", 
	GE=>"Georgia", 
	GB=>"United Kingdom", 
	UK=>"United Kingdom", 
	GA=>"Gabon", 
	GN=>"Guinea", 
	GM=>"Gambia", 
	GL=>"Greenland", 
	KW=>"Kuwait", 
	GH=>"Ghana", 
	OM=>"Oman", 
	_3=>"Somaliland", 
	_2=>"Western Sahara", 
	_1=>"Kosovo", 
	_0=>"Northern Cyprus", 
	JO=>"Jordan", 
	HR=>"Croatia", 
	HT=>"Haiti", 
	HU=>"Hungary", 
	HN=>"Honduras", 
	LV=>"Latvia", 
	PR=>"Puerto Rico", 
	PS=>"West Bank", 
	PT=>"Portugal", 
	PY=>"Paraguay", 
	PA=>"Panama", 
	PG=>"Papua New Guinea", 
	PE=>"Peru", 
	PK=>"Pakistan", 
	PH=>"Philippines", 
	PL=>"Poland", 
	ZM=>"Zambia", 
	EE=>"Estonia", 
	EG=>"Egypt", 
	ZA=>"South Africa", 
	EC=>"Ecuador", 
	AL=>"Albania", 
	AO=>"Angola", 
	KZ=>"Kazakhstan", 
	ET=>"Ethiopia", 
	ZW=>"Zimbabwe", 
	ES=>"Spain", 
	ER=>"Eritrea", 
	ME=>"Montenegro", 
	MD=>"Moldova", 
	MG=>"Madagascar", 
	MA=>"Morocco", 
	UZ=>"Uzbekistan", 
	MM=>"Myanmar", 
	ML=>"Mali", 
	MN=>"Mongolia", 
	MK=>"Macedonia", 
	MW=>"Malawi", 
	MR=>"Mauritania", 
	UG=>"Uganda", 
	MY=>"Malaysia", 
	MX=>"Mexico", 
	VU=>"Vanuatu", 
	FR=>"France", 
	FI=>"Finland", 
	FJ=>"Fiji", 
	FK=>"Falkland Islands", 
	NI=>"Nicaragua", 
	NL=>"Netherlands", 
	NO=>"Norway", 
	NA=>"Namibia", 
	NC=>"New Caledonia", 
	NE=>"Niger", 
	NG=>"Nigeria", 
	NZ=>"New Zealand", 
	NP=>"Nepal", 
	CI=>"Ivory Coast", 
	CH=>"Switzerland", 
	CO=>"Colombia", 
	CN=>"China", 
	CM=>"Cameroon", 
	CL=>"Chile", 
	CA=>"Canada", 
	CG=>"Republic of the Congo", 
	CF=>"Central African Republic", 
	CD=>"Democratic Republic of the Congo", 
	CZ=>"Czech Republic", 
	CY=>"Cyprus", 
	CR=>"Costa Rica", 
	CU=>"Cuba", 
	SZ=>"Swaziland", 
	SY=>"Syria", 
	KG=>"Kyrgyzstan", 
	KE=>"Kenya", 
	SS=>"South Sudan", 
	SR=>"Suriname", 
	KH=>"Cambodia", 
	SV=>"El Salvador", 
	SK=>"Slovakia", 
	KR=>"South Korea", 
	SI=>"Slovenia", 
	KP=>"North Korea", 
	SO=>"Somalia", 
	SN=>"Senegal", 
	SL=>"Sierra Leone", 
	SB=>"Solomon Islands", 
	SA=>"Saudi Arabia", 
	SE=>"Sweden", 
	SD=>"Sudan", 
	DO=>"Dominican Republic", 
	DJ=>"Djibouti", 
	DK=>"Denmark", 
	DE=>"Germany", 
	YE=>"Yemen", 
	AT=>"Austria", 
	DZ=>"Algeria", 
	US=>"United States of America", 
	UY=>"Uruguay", 
	LB=>"Lebanon", 
	LA=>"Laos", 
	TW=>"Taiwan", 
	TT=>"Trinidad and Tobago", 
	TR=>"Turkey", 
	LK=>"Sri Lanka", 
	TN=>"Tunisia", 
	TL=>"East Timor", 
	TM=>"Turkmenistan", 
	TJ=>"Tajikistan", 
	LS=>"Lesotho", 
	TH=>"Thailand", 
	TF=>"French Southern and Antarctic Lands", 
	TG=>"Togo", 
	TD=>"Chad", 
	LY=>"Libya", 
	AE=>"United Arab Emirates", 
	VE=>"Venezuela", 
	AF=>"Afghanistan", 
	IQ=>"Iraq", 
	IS=>"Iceland", 
	IR=>"Iran", 
	AM=>"Armenia", 
	IT=>"Italy", 
	VN=>"Vietnam", 
	AR=>"Argentina", 
	AU=>"Australia", 
	IL=>"Israel", 
	IN=>"India", 
	TZ=>"Tanzania", 
	AZ=>"Azerbaijan", 
	IE=>"Ireland", 
	ID=>"Indonesia", 
	UA=>"Ukraine", 
	QA=>"Qatar", 
	MZ=>"Mozambique"
);

my %cc = (
	221 => "ZA",
	200 => "LS",
	91 => "FR",
	86 => "DE",
	93 => "UK",
	88=> "ES",
	113=>"PT",
	100=>"IT",
	96=>"GR",
	99=>"UE",
	169=>"TR",
	188=>"EG",
	138=>"IN",
	16=>"AU",
	28=>"NZ",
	115=>"RU",
	4=>"CL",
	110=>"NL",
	80=>"BE",
	79=>"AT",
	84=>"CH",
	73=>"US",
	63=>"MX",
	3=>"BR",
	48=>"CA",
	219=>"TZ",
	203=>"MZ",
	197=>"KE",
	192=>"GH",
	112=>"PL",
	85=>"CZ",
	98=>"HU",
	158=>"PH",
	133=>"CN",
	173=>"JP",
	151=>"QA",
	228=>"MG",
	199=>"LY",
	187=>"DZ",
	218=>"TN",
	162=>"SA",
	172=>"YE",
	206=>"NA",
	180=>"BW",
	223=>"ZW",
	215=>"SZ",
	205=>"MW",
	176=>"AO",
	222=>"ZM",
	184=>"CD",
	185=>"CG",
	196=>"CQ",
	183=>"CM",
	174=>"LK",
	137=>"ID"
);

sub fetch_flag($$) {
	my $cc = shift;
	my $fn = shift;
	print STDERR "Fetching flag for ".$cc."\n";
	my $baseurl = "http://www.geognos.com/api/en/countries/flag/";
	system('curl '.$baseurl.$cc.'.png > '.$fn);
}

sub fetch_all_flags {
	foreach my $cc (keys(%ccs)) {
		my $coco = uc($cc);
		my $fn = $flag_dir."/".$coco.".png";
		unless (-f $fn) {
			fetch_flag($coco,$fn);
		}
	}
}

sub polar_to_pixel($$$) {
	(my $image, my $long, my $lat) = @_;
	
	my $xref = ($long) / 360;
	my $yref = ($lat) / 180;

	my $x = $xref * $width;
	my $y = $yref * $height;

	return $image->GetPixel(x=>$x,y=>$y);
}

for (my $long = 0; $long < 3600; $long+=$step) {
	for (my $lat = 0; $lat < 1800; $lat+=$step) {
		my ($lo,$la) = ($long/10,$lat/10);
		my ($r,$g,$b) = polar_to_pixel($image,$lo,$la);

		my $ival = 0;
		my $ref = int($r * 256);
		if (defined($cc{$ref})) {
			$supermem[$long/$step][$lat/$step] = "'".$cc{$ref}."'";
		} else {
			$supermem[$long/$step][$lat/$step] = $ref;
		}

		push(@{$countryindex[$ref]},"[".($long/10).",".($lat/10)."]");
	}
}

fetch_all_flags();
open (OUT,"> ".$outfile);
my @lines;
foreach my $x (@supermem) {
	push(@lines,"[".join(",",@{$x})."]\n");
}
print OUT "GLOBE.GEO.geolookup = [".join(",",@lines)."];\n";

@lines =();
my $i = 1;
shift @countryindex;
foreach my $line (@countryindex) {
	my $ref = $cc{$i} || $i;
	push(@lines,"'$ref': [".join(",",@{$line})."]\n");
	$i++;
}
print OUT "GLOBE.GEO.countrylookup = { ".join(",",@lines)."};\n";


@lines= ();
foreach my $iso (keys(%ccs)) {
	push (@lines,"'".$iso."':'".$ccs{$iso}."'");
}
print OUT "GLOBE.GEO.countrynames = {".join(",",@lines)."};\n";

my @rlines= ();
@lines = ();
for (my $i = 0; $i < 256; $i++) {
 	push (@lines,"'".($cc{$i} || $i)."'");

	# Worksround for GB/UK fuckup.
	if (($cc{$i} || $i) eq "UK") {
		push(@rlines,"'GB':".$i);
	}
	push(@rlines,"'".($cc{$i} || $i)."':".$i);
}
print OUT "GLOBE.GEO.countrylist = [".join(",",@lines). "];\n";
print OUT "GLOBE.GEO.countryrlist = {".join(",",@rlines)."};\n";


print OUT <<LOOKUP;

GLOBE.GEO.index_to_country = function(idx) {
	return this.countrylist[idx];
}

GLOBE.GEO.country_to_index = function(iso) {
	return this.countryrlist[iso];
}

GLOBE.GEO.lookup_country = function(x,y) {
	try {
		var long_idx = Math.round((x+180)*10/$step);
		var lat_idx = Math.round((y+90)*10/$step);
		var idx = this.geolookup[long_idx][lat_idx];
		return '' + idx;
	} catch (err) {
		return undefined;
	}
}

GLOBE.GEO.lookup_geo_array = function(iso) {
	return this.countrylookup[iso.toUpperCase()];
}

GLOBE.GEO.lookup_geo_points = function(iso) {
	var a = this.lookup_geo_array(iso.toUpperCase());
	try {
		var ret = a[Math.round(a.length/2)-1];
		return ([ret[0] - 180,ret[1] -90]);
	} catch (err) {
		console.log('Cannot lookup geopoints for: '+iso);
		return undefined;
	}
}

GLOBE.GEO.lookup_countryname = function(iso) {
	try {
		return this.countrynames[iso.toUpperCase()];
	} catch (err) {
		console.log('Cannot lookup country name for: '+iso);
	}
}
LOOKUP
close(OUT);









