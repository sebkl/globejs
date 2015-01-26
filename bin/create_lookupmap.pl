#!/usr/bin/perl
use Image::Magick;
use JSON;
use Data::Dumper;

my $step = 5;

my $outfile = shift || "lookup.js";
my $imagemap = shift || "atlas/countrymap.png";
my $country_names_fn = shift || "countrydata/country_names.json";
my $country_map_fn = shift ||   "countrydata/country_map.json";

my $image = Image::Magick->new;
$i = $image->Read($imagemap);
@pixels = $image->GetPixel(x=>1,y=>1);

my $height = $image->Get('rows');
my $width = $image->Get('columns');

my @supermem;
my @countryindex;
my $idx = 0;

sub read_json($) {
	my $fn = shift;
	open my $fh, '<', $fn or die "error opening '$fn': $!";
	my $json = do { local $/; <$fh> };
	my $p = decode_json($json);
	return %{$p};
}

my %ccs = read_json($country_names_fn);
my %cc =  read_json($country_map_fn);

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
