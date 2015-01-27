<div class="well" style="overflow:hidden;">
    <div class="form-group">
        <label>Server</label>
        <select class="form-control">
            <!-- BEGIN serverConfigNames -->
            <option value="{serverConfigNames.serverNumber}">{serverConfigNames.configName}</option>
            <!-- END serverConfigNames -->
        </select>
        <input type="hidden" class="ajaxSelectSibling" name="serverNumber">
    </div>
    <div class="form-group">
        <div class="checkbox">
            <label>
                <input type="checkbox" name="showGlory">Show Glory Border?
            </label>
        </div>
    </div>
    <div class="form-group">
        <label>Glory Border Style</label>
        <select class="form-control">
            <option value="double" selected="selected">Double</option>
            <option value="ridge">Ridge</option>
            <option value="groove">Groove</option>
            <option value="inset">Inset</option>
            <option value="outset">Outset</option>
            <option value="solid">Solid</option>
            <option value="dashed">Dashed</option>
            <option value="dotted">Dotted</option>
        </select>
        <input type="hidden" class="ajaxSelectSibling" name="styleGlory">
    </div>
    <div class="form-group">
        <label class="control-label">Glory Border starting color.</label>
        <div>
            <input type="text" class="form-control ajaxInputColorPicker" name="gloryStart">
        </div>
    </div>
    <div class="form-group">
        <label class="control-label">Glory Border ending color.</label>
        <div>
            <input type="text" class="form-control ajaxInputColorPicker" name="gloryEnd">
        </div>
    </div>
    <div class="form-group">
        <label class="control-label">Widget Title Color</label>
        <div>
            <input type="text" class="form-control ajaxInputColorPicker" name="colorTitle">
        </div>
    </div>
    <div class="form-group">
        <label class="control-label">MOTD Color</label>
        <div>
            <input type="text" class="form-control ajaxInputColorPicker" name="colorMOTD">
        </div>
    </div>
</div>
